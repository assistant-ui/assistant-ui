import { isToolUIPart, getToolName, type UIMessage } from "ai";
import {
  createMessageConverter as unstable_createMessageConverter,
  type useExternalMessageConverter,
} from "@assistant-ui/core/react";
import {
  isMcpAppUri,
  type ReasoningMessagePart,
  type ToolCallMessagePart,
  type TextMessagePart,
  type DataMessagePart,
  type SourceMessagePart,
  type SourceProviderMetadata,
  type FileMessagePart,
  type ThreadMessageLike,
  type McpAppMetadata,
} from "@assistant-ui/core";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { unwrapModelContentEnvelope } from "../../modelContentEnvelope";

type MessageMetadata = ThreadMessageLike["metadata"];
export type AISDKMessageConverterMetadata =
  useExternalMessageConverter.Metadata & {
    toolArgsKeyOrderCache?: Map<string, Map<string, string[]>>;
    toolLastInputCache?: Map<string, ReadonlyJSONObject>;
    mcpAppMetadataCache?: Map<string, McpAppMetadata>;
  };

function stripClosingDelimiters(json: string): string {
  return json.replace(/[}\]"]+$/, "");
}

const MCP_APP_METADATA_CACHE_MAX = 100;

function extractMcpAppMetadata(
  part: unknown,
  cache: Map<string, McpAppMetadata> | undefined,
): McpAppMetadata | undefined {
  if (!part || typeof part !== "object") return undefined;
  let a: Record<string, unknown> | undefined;
  const meta = (part as { callProviderMetadata?: unknown })
    .callProviderMetadata;
  const mcp =
    meta && typeof meta === "object"
      ? (meta as { mcp?: unknown }).mcp
      : undefined;
  const app =
    mcp && typeof mcp === "object" ? (mcp as { app?: unknown }).app : undefined;
  if (app && typeof app === "object") {
    a = app as Record<string, unknown>;
  } else {
    // MCP-UI tools (e.g. xmcp) surface the UI pointer as
    // result._meta["ui/resourceUri"] rather than in callProviderMetadata.
    const output = (part as { output?: unknown }).output;
    const outMeta =
      output && typeof output === "object"
        ? (output as { _meta?: unknown })._meta
        : undefined;
    const uiResourceUri =
      outMeta && typeof outMeta === "object"
        ? (outMeta as Record<string, unknown>)["ui/resourceUri"]
        : undefined;
    if (typeof uiResourceUri !== "string") return undefined;
    a = { resourceUri: uiResourceUri };
  }
  if (typeof a["resourceUri"] !== "string") return undefined;
  if (!isMcpAppUri(a["resourceUri"])) return undefined;
  const cached = cache?.get(a["resourceUri"]);
  if (cached) {
    cache!.delete(a["resourceUri"]);
    cache!.set(a["resourceUri"], cached);
    return cached;
  }
  const out: { -readonly [K in keyof McpAppMetadata]: McpAppMetadata[K] } = {
    resourceUri: a["resourceUri"],
  };
  if (typeof a["mimeType"] === "string") out.mimeType = a["mimeType"];
  if (Array.isArray(a["visibility"])) {
    out.visibility = a["visibility"].filter(
      (v): v is "model" | "app" => v === "model" || v === "app",
    );
  }
  if (cache) {
    if (cache.size >= MCP_APP_METADATA_CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(a["resourceUri"], out);
  }
  return out;
}

const hasOwn = (value: object, key: string) => Object.hasOwn(value, key);

const stabilizeToolArgsValue = (
  value: unknown,
  path: string,
  keyOrderByPath: Map<string, string[]>,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, idx) =>
      stabilizeToolArgsValue(item, `${path}[${idx}]`, keyOrderByPath),
    );
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const currentKeys = Object.keys(record);
    const previousOrder = keyOrderByPath.get(path) ?? [];
    const previousOrderSet = new Set(previousOrder);
    const nextOrder = [
      ...previousOrder.filter((key) => hasOwn(record, key)),
      ...currentKeys.filter((key) => !previousOrderSet.has(key)),
    ];
    keyOrderByPath.set(path, nextOrder);

    return Object.fromEntries(
      nextOrder.map((key) => [
        key,
        stabilizeToolArgsValue(record[key], `${path}.${key}`, keyOrderByPath),
      ]),
    );
  }

  return value;
};

function stableStringifyToolArgs(
  keyOrderCache: Map<string, Map<string, string[]>> | undefined,
  cacheKey: string,
  args: ReadonlyJSONObject,
): string {
  const keyOrderByPath = keyOrderCache?.get(cacheKey) ?? new Map();
  keyOrderCache?.set(cacheKey, keyOrderByPath);

  const stableArgs = stabilizeToolArgsValue(
    args,
    "$",
    keyOrderByPath,
  ) as ReadonlyJSONObject;
  return JSON.stringify(stableArgs);
}

/**
 * Resolves the interrupt fields for a tool call part.
 *
 * Two interrupt paths for tool approvals:
 * 1. AI SDK server-side approval: approval-requested state with part.approval payload
 * 2. Frontend tools: toolStatuses interrupt from context.human()
 */
function getToolInterrupt(
  part: { state: string; approval?: unknown },
  toolStatus: { type: string; payload?: unknown } | undefined,
): Record<string, unknown> {
  if (part.state === "approval-requested" && "approval" in part) {
    return {
      interrupt: {
        type: "human" as const,
        payload: (part as { approval: unknown }).approval,
      },
      status: {
        type: "requires-action" as const,
        reason: "interrupt" as const,
      },
    };
  }

  if (toolStatus?.type === "interrupt") {
    return {
      interrupt: toolStatus.payload,
      status: {
        type: "requires-action" as const,
        reason: "interrupt" as const,
      },
    };
  }

  return {};
}

type MessageContent = Exclude<ThreadMessageLike["content"], string>;

function convertParts(
  message: UIMessage,
  metadata: AISDKMessageConverterMetadata,
): MessageContent {
  if (!message.parts || message.parts.length === 0) {
    return [];
  }

  const converted = message.parts
    .filter(
      (p) =>
        p.type !== "step-start" &&
        (message.role !== "user" || p.type !== "file"),
    )
    .map((part) => {
      if (part.type === "text") {
        return {
          type: "text",
          text: part.text,
        } satisfies TextMessagePart;
      }

      if (part.type === "reasoning") {
        return {
          type: "reasoning",
          text: part.text,
        } satisfies ReasoningMessagePart;
      }

      if (isToolUIPart(part)) {
        const toolName = getToolName(part);
        const toolCallId = part.toolCallId;
        const argsKeyOrderCacheKey = `${message.id}:${toolCallId}`;

        const rawInput = part.input as ReadonlyJSONObject | null | undefined;
        let args: ReadonlyJSONObject;
        if (
          rawInput != null &&
          typeof rawInput === "object" &&
          !Array.isArray(rawInput)
        ) {
          args = rawInput;
          metadata.toolLastInputCache?.set(argsKeyOrderCacheKey, args);
        } else {
          args = metadata.toolLastInputCache?.get(argsKeyOrderCacheKey) ?? {};
        }

        let result: unknown;
        let modelContent: ToolCallMessagePart["modelContent"];
        let isError = false;

        if (part.state === "output-available") {
          const unwrapped = unwrapModelContentEnvelope(part.output);
          result = unwrapped.result;
          modelContent = unwrapped.modelContent;
        } else if (part.state === "output-error") {
          isError = true;
          result = { error: part.errorText };
        } else if (part.state === "output-denied") {
          isError = true;
          result = {
            error:
              (part as { approval: { reason?: string } }).approval.reason ||
              "Tool approval denied",
          };
        }

        let argsText = stableStringifyToolArgs(
          metadata.toolArgsKeyOrderCache,
          argsKeyOrderCacheKey,
          args,
        );
        if (part.state === "input-streaming") {
          // strip closing delimiters added by the AI SDK's fix-json
          argsText = stripClosingDelimiters(argsText);
        } else {
          metadata.toolArgsKeyOrderCache?.delete(argsKeyOrderCacheKey);
          if (
            part.state === "output-available" ||
            part.state === "output-error" ||
            part.state === "output-denied"
          ) {
            metadata.toolLastInputCache?.delete(argsKeyOrderCacheKey);
          }
        }

        const toolStatus = metadata.toolStatuses?.[toolCallId];
        const mcpApp = extractMcpAppMetadata(
          part,
          metadata.mcpAppMetadataCache,
        );
        return {
          type: "tool-call",
          toolName,
          toolCallId,
          argsText,
          args,
          result,
          isError,
          ...(modelContent !== undefined && { modelContent }),
          ...(mcpApp && { mcp: { app: mcpApp } }),
          ...getToolInterrupt(part, toolStatus),
        } satisfies ToolCallMessagePart;
      }

      if (part.type === "source-url") {
        return {
          type: "source",
          sourceType: "url",
          id: part.sourceId,
          url: part.url,
          ...(part.title != null ? { title: part.title } : undefined),
          ...(part.providerMetadata != null
            ? {
                providerMetadata:
                  part.providerMetadata as SourceProviderMetadata,
              }
            : undefined),
        } satisfies SourceMessagePart;
      }

      if (part.type === "file") {
        return {
          type: "file",
          data: part.url,
          mimeType: part.mediaType,
          ...(part.filename != null && { filename: part.filename }),
        } satisfies FileMessagePart;
      }

      if (part.type === "source-document") {
        return {
          type: "source",
          sourceType: "document",
          id: part.sourceId,
          title: part.title,
          mediaType: part.mediaType,
          ...(part.filename != null ? { filename: part.filename } : undefined),
          ...(part.providerMetadata != null
            ? {
                providerMetadata:
                  part.providerMetadata as SourceProviderMetadata,
              }
            : undefined),
        } satisfies SourceMessagePart;
      }

      if (part.type.startsWith("data-")) {
        return {
          type: "data",
          name: part.type.substring(5),
          data: (part as any).data,
        } satisfies DataMessagePart;
      }

      console.warn(`Unsupported message part type: ${part.type}`);
      return null;
    })
    .filter(Boolean) as MessageContent[number][];

  const seenToolCallIds = new Set<string>();
  return converted.filter((part) => {
    if (part.type === "tool-call" && part.toolCallId != null) {
      if (seenToolCallIds.has(part.toolCallId)) return false;
      seenToolCallIds.add(part.toolCallId);
    }
    return true;
  });
}

export const AISDKMessageConverter = unstable_createMessageConverter(
  (message: UIMessage, metadata: AISDKMessageConverterMetadata) => {
    const createdAt = new Date();
    const content = convertParts(message, metadata);

    switch (message.role) {
      case "user":
        return {
          role: "user",
          id: message.id,
          createdAt,
          content,
          attachments: message.parts
            ?.filter((p) => p.type === "file")
            .map((part, idx) => ({
              id: idx.toString(),
              type: part.mediaType.startsWith("image/") ? "image" : "file",
              name: part.filename ?? "file",
              content: [
                part.mediaType.startsWith("image/")
                  ? {
                      type: "image",
                      image: part.url,
                      filename: part.filename!,
                    }
                  : {
                      type: "file",
                      filename: part.filename!,
                      data: part.url,
                      mimeType: part.mediaType,
                    },
              ],
              contentType: part.mediaType ?? "unknown/unknown",
              status: { type: "complete" as const },
            })),
          metadata: message.metadata as MessageMetadata,
        };

      case "system":
      case "assistant": {
        const timing = metadata.messageTiming?.[message.id];
        return {
          role: message.role,
          id: message.id,
          createdAt,
          content,
          metadata: {
            ...(message.metadata as MessageMetadata),
            ...(timing && { timing }),
          },
        };
      }

      default:
        console.warn(`Unsupported message role: ${message.role}`);
        return [];
    }
  },
);
