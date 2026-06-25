"use client";

import type { InputContent } from "@ag-ui/client";
import type { ThreadMessageLike as CoreThreadMessageLike } from "@assistant-ui/core";
import { getAutoStatus } from "@assistant-ui/core/internal";
import { type Tool, toToolsJSONSchema } from "assistant-stream";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import {
  AG_UI_METADATA_NAMESPACE,
  type AgUiCustomMetadata,
} from "./run-aggregator";
import type { AgUiInterrupt } from "../types";

export type { InputContent };

type AttachmentLike = {
  name?: string | undefined;
  contentType?: string | undefined;
  content?: readonly unknown[] | undefined;
};

type ThreadMessageLike = {
  id: string;
  role: string;
  content: unknown;
  name?: string;
  toolCallId?: string;
  error?: string;
  attachments?: readonly AttachmentLike[];
};

type AgUiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type AgUiMessage =
  | {
      id: string;
      role: string;
      content: string | InputContent[];
      name?: string;
      toolCalls?: AgUiToolCall[];
    }
  | {
      id: string;
      role: "tool";
      content: string;
      toolCallId: string;
      error?: string;
    };

type ToolCallPart = {
  type: "tool-call";
  toolCallId?: string;
  toolName: string;
  argsText?: string;
  args?: ReadonlyJSONObject;
  result?: unknown;
  isError?: boolean;
  unstable_toolMessageId?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
};

const getToolCallId = (record: Record<string, unknown>) =>
  getString(record, "toolCallId") ?? getString(record, "tool_call_id");

function parseJSONText(value: string): unknown {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function generateId(): string {
  return (
    (globalThis.crypto as { randomUUID?: () => string })?.randomUUID?.() ??
    Math.random().toString(36).slice(2)
  );
}

function normalizeToolCall(part: ToolCallPart): {
  id: string;
  call: AgUiToolCall;
} {
  const id = part.toolCallId ?? generateId();
  const argsText =
    typeof part.argsText === "string"
      ? part.argsText
      : JSON.stringify(part.args ?? {});

  return {
    id,
    call: {
      id,
      type: "function",
      function: {
        name: part.toolName ?? "tool",
        arguments: argsText,
      },
    },
  };
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        part?.type === "text" && typeof part?.text === "string",
    )
    .map((part) => part.text)
    .join("\n");
}

function parseDataUrl(
  value: string,
): { mimeType: string; data: string } | null {
  const match = value.match(/^data:([^;,]+)(?:;[^;,]+)*;base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1]!, data: match[2]! };
}

const httpUrlPattern = /^https?:\/\//i;

type InputContentSource =
  | { type: "data"; value: string; mimeType: string }
  | { type: "url"; value: string; mimeType?: string };

type MediaInputType = "image" | "audio" | "video" | "document";

function mediaTypeForMime(mimeType: string | undefined): MediaInputType {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("audio/")) return "audio";
  if (mimeType?.startsWith("video/")) return "video";
  return "document";
}

// Build an AG-UI multimodal source from a data URL, raw base64 payload, or an
// http(s) URL. A `url` source may omit the mime type; a `data` source always
// resolves one (falling back to application/octet-stream).
function buildInputSource(
  value: string,
  declaredMimeType: string | undefined,
): InputContentSource {
  if (httpUrlPattern.test(value)) {
    return declaredMimeType !== undefined
      ? { type: "url", value, mimeType: declaredMimeType }
      : { type: "url", value };
  }
  const parsed = parseDataUrl(value);
  return {
    type: "data",
    value: parsed?.data ?? value,
    mimeType:
      parsed?.mimeType ?? declaredMimeType ?? "application/octet-stream",
  };
}

function toInputContent(
  part: unknown,
  fallbackMimeType: string | undefined,
): InputContent | null {
  if (!isObject(part)) return null;
  const type = getString(part, "type");

  if (type === "text") {
    const text = getString(part, "text");
    if (text === undefined) return null;
    return { type: "text", text };
  }

  if (type === "image") {
    const image = getString(part, "image");
    if (image === undefined) return null;
    return { type: "image", source: buildInputSource(image, fallbackMimeType) };
  }

  if (type === "file") {
    const data = getString(part, "data");
    if (data === undefined) return null;
    const declaredMimeType = getString(part, "mimeType") || fallbackMimeType;
    const filename = getString(part, "filename");
    const source = buildInputSource(data, declaredMimeType);
    const metadata = filename !== undefined ? { filename } : undefined;
    switch (mediaTypeForMime(source.mimeType)) {
      case "image":
        return { type: "image", source, ...(metadata && { metadata }) };
      case "audio":
        return { type: "audio", source, ...(metadata && { metadata }) };
      case "video":
        return { type: "video", source, ...(metadata && { metadata }) };
      default:
        return { type: "document", source, ...(metadata && { metadata }) };
    }
  }

  return null;
}

type SnapshotAttachment = NonNullable<
  CoreThreadMessageLike["attachments"]
>[number];

const mediaInputTypes = new Set(["image", "audio", "video", "document"]);

// Inverse of buildInputSource.
function inputSourceToString(
  value: unknown,
): { value: string; mimeType?: string } | null {
  if (!isObject(value)) return null;
  const sourceValue = getString(value, "value");
  if (sourceValue === undefined) return null;
  const mimeType = getString(value, "mimeType");
  const type = getString(value, "type");
  if (type === "url") {
    return { value: sourceValue, ...(mimeType !== undefined && { mimeType }) };
  }
  if (type === "data") {
    const resolvedMimeType = mimeType ?? "application/octet-stream";
    return {
      value: `data:${resolvedMimeType};base64,${sourceValue}`,
      mimeType: resolvedMimeType,
    };
  }
  return null;
}

// Mirrors @ag-ui/client's BackwardCompatibility_0_0_47 middleware.
function upgradeBinaryInputPart(
  part: Record<string, unknown>,
): Record<string, unknown> | null {
  const mimeType = getString(part, "mimeType");
  if (mimeType === undefined) return null;
  const data = getString(part, "data");
  const url = getString(part, "url");
  const source = data
    ? { type: "data", value: data, mimeType }
    : url
      ? { type: "url", value: url, mimeType }
      : null;
  if (!source) return null;
  const filename = getString(part, "filename");
  return {
    type: mediaTypeForMime(mimeType),
    source,
    ...(filename && { metadata: { filename } }),
  };
}

function toSnapshotAttachments(content: unknown): SnapshotAttachment[] {
  if (!Array.isArray(content)) return [];

  const attachments: SnapshotAttachment[] = [];
  for (const rawPart of content) {
    if (!isObject(rawPart)) continue;
    const part =
      getString(rawPart, "type") === "binary"
        ? upgradeBinaryInputPart(rawPart)
        : rawPart;
    if (!part) continue;
    const type = getString(part, "type");
    if (type === undefined || !mediaInputTypes.has(type)) continue;
    const source = inputSourceToString(part.source);
    if (!source) continue;

    const filename = isObject(part.metadata)
      ? getString(part.metadata, "filename")
      : undefined;
    const id = attachments.length.toString();

    if (type === "image") {
      attachments.push({
        id,
        type: "image",
        name: filename ?? "image",
        ...(source.mimeType !== undefined && { contentType: source.mimeType }),
        status: { type: "complete" },
        content: [
          {
            type: "image",
            image: source.value,
            ...(filename !== undefined && { filename }),
          },
        ],
      });
      continue;
    }

    const mimeType = source.mimeType ?? "application/octet-stream";
    attachments.push({
      id,
      type: type === "document" ? "document" : "file",
      name: filename ?? "file",
      contentType: mimeType,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          data: source.value,
          mimeType,
          ...(filename !== undefined && { filename }),
        },
      ],
    });
  }
  return attachments;
}

function buildUserContent(message: ThreadMessageLike): string | InputContent[] {
  // File parts in message.content are intentionally skipped: the canonical
  // binary payload for files always flows through message.attachments.
  const contentParts = Array.isArray(message.content)
    ? message.content.filter(
        (part) => !(isObject(part) && part.type === "file"),
      )
    : [];

  const attachments = message.attachments ?? [];

  const converted: InputContent[] = [];

  // Promote string-form content to a leading text part so it survives when
  // non-text attachments are present (fromAgUiMessages emits string content).
  if (typeof message.content === "string" && message.content.length > 0) {
    converted.push({ type: "text", text: message.content });
  }

  for (const part of contentParts) {
    const input = toInputContent(part, undefined);
    if (input) converted.push(input);
  }
  for (const attachment of attachments) {
    if (!isObject(attachment)) continue;
    const attachmentContent = attachment.content;
    if (!Array.isArray(attachmentContent)) continue;
    const fallbackMime = getString(attachment, "contentType");
    for (const part of attachmentContent) {
      const input = toInputContent(part, fallbackMime);
      if (input) converted.push(input);
    }
  }

  const hasNonText = converted.some((part) => part.type !== "text");
  if (hasNonText) return converted;

  // All-text path: collapse to plain string. Join text parts collected from
  // both content and attachments so attachment-sourced text is not dropped.
  if (converted.length === 0) return extractText(message.content);
  return converted
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("\n");
}

function toToolCallPart(value: unknown): ToolCallPart | null {
  if (!isObject(value)) return null;
  const rawFunction = isObject(value.function) ? value.function : null;
  const toolCallId = getString(value, "toolCallId") ?? getString(value, "id");
  const toolName =
    getString(value, "toolName") ??
    getString(value, "name") ??
    (rawFunction ? getString(rawFunction, "name") : undefined) ??
    "tool";
  const argsText =
    getString(value, "argsText") ??
    getString(value, "arguments") ??
    (rawFunction ? getString(rawFunction, "arguments") : undefined);

  const parsedArgs =
    typeof argsText === "string" ? parseJSONText(argsText) : undefined;
  const args =
    isObject(parsedArgs) && !Array.isArray(parsedArgs)
      ? (parsedArgs as ReadonlyJSONObject)
      : isObject(value.args) && !Array.isArray(value.args)
        ? (value.args as ReadonlyJSONObject)
        : undefined;

  const part: ToolCallPart = {
    type: "tool-call",
    ...(toolCallId !== undefined ? { toolCallId } : {}),
    toolName,
    argsText: argsText ?? JSON.stringify(args ?? {}),
    ...(args !== undefined ? { args } : {}),
  };

  if (value.type === "tool-call") {
    const result = value.result;
    const isError = value.isError;
    if (result !== undefined) part.result = result;
    if (typeof isError === "boolean") part.isError = isError;
  }

  return part;
}

function extractAssistantToolCalls(
  message: Record<string, unknown>,
): ToolCallPart[] {
  const parts: ToolCallPart[] = [];
  const seenToolCallIds = new Set<string>();
  const pushPart = (part: ToolCallPart | null) => {
    if (!part) return;
    const id = part.toolCallId ?? generateId();
    if (seenToolCallIds.has(id)) return;
    seenToolCallIds.add(id);
    parts.push({
      ...part,
      toolCallId: id,
    });
  };

  const content = message.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (isObject(part) && part.type === "tool-call") {
        pushPart(toToolCallPart(part));
      }
    }
  }

  const toolCalls = Array.isArray(message.toolCalls)
    ? message.toolCalls
    : Array.isArray(message.tool_calls)
      ? message.tool_calls
      : [];
  for (const call of toolCalls) {
    pushPart(toToolCallPart(call));
  }

  return parts;
}

function validateInterrupts(value: unknown): AgUiInterrupt[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const valid = value.filter(
    (entry): entry is AgUiInterrupt =>
      isObject(entry) &&
      typeof entry.id === "string" &&
      typeof entry.reason === "string",
  );
  return valid.length > 0 ? valid : undefined;
}

function readPersistedInterrupts(
  metadata: unknown,
): AgUiInterrupt[] | undefined {
  if (!isObject(metadata)) return undefined;
  const custom = metadata.custom;
  if (!isObject(custom)) return undefined;
  const namespaced = custom[AG_UI_METADATA_NAMESPACE];
  if (!isObject(namespaced)) return undefined;
  return validateInterrupts(namespaced.interrupts);
}

function toAssistantSnapshotMessage(
  rawMessage: Record<string, unknown>,
): CoreThreadMessageLike {
  const text = extractText(rawMessage.content);
  const toolCallParts = extractAssistantToolCalls(rawMessage);
  const assistantContent = [
    ...(text.length > 0 ? [{ type: "text" as const, text }] : []),
    ...toolCallParts,
  ];
  const messageName = getString(rawMessage, "name");
  const interrupts = readPersistedInterrupts(rawMessage.metadata);
  return {
    id: getString(rawMessage, "id") ?? generateId(),
    role: "assistant",
    content: assistantContent.length > 0 ? assistantContent : "",
    ...(messageName !== undefined ? { name: messageName } : {}),
    ...(interrupts
      ? {
          metadata: {
            custom: {
              [AG_UI_METADATA_NAMESPACE]: {
                interrupts,
              } satisfies AgUiCustomMetadata,
            },
          },
        }
      : {}),
  };
}

function toUserOrSystemSnapshotMessage(
  role: "user" | "system",
  rawMessage: Record<string, unknown>,
): CoreThreadMessageLike {
  const messageName = getString(rawMessage, "name");
  const attachments =
    role === "user" ? toSnapshotAttachments(rawMessage.content) : [];
  return {
    id: getString(rawMessage, "id") ?? generateId(),
    role,
    content: extractText(rawMessage.content),
    ...(messageName !== undefined ? { name: messageName } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
  };
}

export type FromAgUiMessagesOptions = {
  /**
   * Whether to convert `reasoning` messages into visible reasoning parts.
   * Matches the `showThinking` option of `useAgUiRuntime`. Defaults to `true`.
   */
  showThinking?: boolean;
};

export function fromAgUiMessages(
  messages: readonly unknown[],
  options?: FromAgUiMessagesOptions,
): CoreThreadMessageLike[] {
  const showThinking = options?.showThinking ?? true;
  const converted: CoreThreadMessageLike[] = [];

  for (const rawMessage of messages) {
    if (!isObject(rawMessage)) continue;
    const role = getString(rawMessage, "role");
    if (!role) continue;

    if (role === "tool") {
      const toolCallId = getToolCallId(rawMessage) ?? `tool-${generateId()}`;
      const toolMessageId = getString(rawMessage, "id");
      const result =
        rawMessage.result !== undefined
          ? rawMessage.result
          : typeof rawMessage.content === "string"
            ? parseJSONText(rawMessage.content)
            : rawMessage.content;
      const isError =
        typeof rawMessage.error === "string" ||
        rawMessage.isError === true ||
        rawMessage.status === "error"
          ? true
          : rawMessage.isError === false
            ? false
            : undefined;

      let updated = false;
      for (
        let messageIndex = converted.length - 1;
        messageIndex >= 0 && !updated;
        messageIndex--
      ) {
        const message = converted[messageIndex];
        if (
          !message ||
          message.role !== "assistant" ||
          !Array.isArray(message.content)
        )
          continue;

        for (
          let partIndex = message.content.length - 1;
          partIndex >= 0;
          partIndex--
        ) {
          const part = message.content[partIndex];
          if (!isObject(part) || part.type !== "tool-call") continue;
          if (getString(part, "toolCallId") !== toolCallId) continue;

          const updatedPart: ToolCallPart = {
            ...(part as ToolCallPart),
            result,
            ...(isError !== undefined ? { isError } : {}),
            ...(toolMessageId !== undefined
              ? { unstable_toolMessageId: toolMessageId }
              : {}),
          };
          const updatedContent = message.content.map((contentPart, index) =>
            index === partIndex ? updatedPart : contentPart,
          );
          converted[messageIndex] = { ...message, content: updatedContent };
          updated = true;
          break;
        }
      }

      if (updated) {
        continue;
      }

      const id = toolMessageId ?? toolCallId;
      const toolName =
        getString(rawMessage, "name") ??
        getString(rawMessage, "toolName") ??
        "tool";
      converted.push({
        id: `${id}:assistant`,
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId,
            toolName,
            args: {},
            argsText: "{}",
            result,
            ...(isError !== undefined ? { isError } : {}),
            ...(toolMessageId !== undefined
              ? { unstable_toolMessageId: toolMessageId }
              : {}),
          },
        ],
      });
      continue;
    }

    if (role === "assistant") {
      converted.push(toAssistantSnapshotMessage(rawMessage));
      continue;
    }

    if (role === "reasoning") {
      // Gate on showThinking so a cold reload matches the live run: the
      // aggregator never stores reasoning parts when showThinking is false.
      if (!showThinking) continue;
      const text = extractText(rawMessage.content);
      if (text.trim().length === 0) continue;
      converted.push({
        id: getString(rawMessage, "id") ?? generateId(),
        role: "assistant",
        content: [{ type: "reasoning", text }],
      });
      continue;
    }

    if (role === "user" || role === "system") {
      converted.push(toUserOrSystemSnapshotMessage(role, rawMessage));
    }
  }

  for (let i = 0; i < converted.length; i++) {
    const message = converted[i]!;
    if (message.role !== "assistant") continue;

    const hasInterrupt =
      readPersistedInterrupts(message.metadata) !== undefined;
    const hasPendingToolCall =
      Array.isArray(message.content) &&
      message.content.some(
        (part) =>
          isObject(part) &&
          part.type === "tool-call" &&
          part.result === undefined,
      );

    if (hasInterrupt || hasPendingToolCall) {
      converted[i] = {
        ...message,
        status: getAutoStatus(
          false,
          false,
          hasInterrupt,
          hasPendingToolCall,
          undefined,
        ),
      };
    }
  }

  return converted;
}

function convertAssistantMessage(
  message: ThreadMessageLike,
  converted: AgUiMessage[],
): void {
  const content = extractText(message.content);
  const contentArray = Array.isArray(message.content) ? message.content : [];

  const toolCallParts = contentArray.filter(
    (part): part is ToolCallPart => part?.type === "tool-call",
  );

  const toolCalls = toolCallParts.map((part) => ({
    ...normalizeToolCall(part),
    part,
  }));

  // Drop assistant messages with no text or tool calls (e.g. an imported
  // reasoning-only entry) so they are not re-sent as a blank assistant turn.
  if (content.length === 0 && toolCalls.length === 0) {
    return;
  }

  const assistantMessage: AgUiMessage = {
    id: message.id,
    role: "assistant",
    content,
  };
  if (message.name) {
    assistantMessage.name = message.name;
  }
  if (toolCalls.length > 0) {
    assistantMessage.toolCalls = toolCalls.map((entry) => entry.call);
  }
  converted.push(assistantMessage);

  for (const { id: toolCallId, part } of toolCalls) {
    if (part.result === undefined) continue;

    const resultContent =
      typeof part.result === "string"
        ? part.result
        : JSON.stringify(part.result);

    const toolMessage: AgUiMessage = {
      id: part.unstable_toolMessageId ?? `${toolCallId}:tool`,
      role: "tool",
      content: resultContent,
      toolCallId,
    };
    if (part.isError) {
      toolMessage.error = resultContent;
    }
    converted.push(toolMessage);
  }
}

function convertToolMessage(
  message: ThreadMessageLike,
  converted: AgUiMessage[],
): void {
  const content = extractText(message.content);
  const toolCallId = message.toolCallId ?? generateId();

  const toolMessage: AgUiMessage = {
    id: message.id,
    role: "tool",
    content,
    toolCallId,
  };
  if (typeof message.error === "string") {
    toolMessage.error = message.error;
  }
  converted.push(toolMessage);
}

export function toAgUiMessages(
  messages: readonly ThreadMessageLike[],
): AgUiMessage[] {
  const converted: AgUiMessage[] = [];

  for (const message of messages) {
    if (message.role === "assistant") {
      convertAssistantMessage(message, converted);
      continue;
    }

    if (message.role === "tool") {
      convertToolMessage(message, converted);
      continue;
    }

    const genericMessage: AgUiMessage = {
      id: message.id,
      role: message.role,
      content:
        message.role === "user"
          ? buildUserContent(message)
          : extractText(message.content),
    };
    if (message.name) {
      genericMessage.name = message.name;
    }
    converted.push(genericMessage);
  }

  return converted;
}

type AgUiTool = {
  name: string;
  description: string | undefined;
  parameters: unknown;
};

export function toAgUiTools(
  tools: Record<string, Tool> | undefined,
): AgUiTool[] {
  if (!tools) return [];

  const toolsSchema = toToolsJSONSchema(tools);
  return Object.entries(toolsSchema).map(([name, tool]) => ({
    name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
