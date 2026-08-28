"use client";

import type {
  CompleteAttachment,
  DataMessagePart,
  MessageTiming,
  ThreadAssistantMessage,
  ThreadUserMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import {
  parseDataUrl,
  stableStringifyToolArgs,
  trackToolArgsKeyOrder,
} from "@assistant-ui/core/internal";
import {
  convertLangChainContentBlock,
  getCustomMetadata,
  uiMessageToDataPart,
  withAudioTranscript,
} from "@assistant-ui/react-langchain/converter";
import type {
  LangChainMessage,
  LangChainToolCall,
  LangChainToolCallChunk,
  UIMessage,
} from "./types";
import {
  parsePartialJsonObject,
  type ReadonlyJSONObject,
} from "assistant-stream/utils";

type LangGraphMessageConverterMetadata =
  useExternalMessageConverter.Metadata & {
    toolArgsKeyOrderCache?: Map<string, Map<string, string[]>>;
    uiMessagesByParent?: Map<string, UIMessage[]>;
    messageTiming?: Record<string, MessageTiming>;
    attachmentsByMessageId?: Map<string, readonly CompleteAttachment[]>;
  };

const getToolArgsCacheKey = (
  messageId: string | undefined,
  kind: "tool" | "computer",
  toolCallId: string,
) => `${messageId ?? "unknown"}:${kind}:${toolCallId}`;

const resolveToolCallArgs = ({
  chunk,
  matchingToolCallChunk,
  messageId,
  toolArgsKeyOrderCache,
  toolCallId,
}: {
  chunk: LangChainToolCall;
  matchingToolCallChunk: LangChainToolCallChunk | undefined;
  messageId: string | undefined;
  toolArgsKeyOrderCache: Map<string, Map<string, string[]>> | undefined;
  toolCallId: string;
}): Pick<ToolCallMessagePart, "args" | "argsText"> => {
  const cacheKey = getToolArgsCacheKey(messageId, "tool", toolCallId);
  const streamedArgsText =
    matchingToolCallChunk?.args ?? matchingToolCallChunk?.args_json;
  const isStreamingArglessChunk =
    matchingToolCallChunk !== undefined &&
    streamedArgsText === undefined &&
    Object.keys(chunk.args).length === 0;
  const providedArgsText =
    chunk.partial_json ??
    streamedArgsText ??
    (isStreamingArglessChunk ? "" : undefined);
  const argsText =
    providedArgsText ??
    stableStringifyToolArgs(toolArgsKeyOrderCache, cacheKey, chunk.args);

  const parsedPartialArgs = argsText ? parsePartialJsonObject(argsText) : null;
  const args = (
    argsText ? (parsedPartialArgs ?? {}) : chunk.args
  ) as ReadonlyJSONObject;
  trackToolArgsKeyOrder(
    toolArgsKeyOrderCache,
    cacheKey,
    (parsedPartialArgs ?? chunk.args) as ReadonlyJSONObject,
  );

  if (providedArgsText == null) {
    toolArgsKeyOrderCache?.delete(cacheKey);
  }

  return { args, argsText };
};

const warnedMessagePartTypes = new Set<string>();
const warnForUnknownMessagePartType = (type: string) => {
  if (
    typeof process === "undefined" ||
    process?.env?.NODE_ENV !== "development"
  )
    return;
  if (warnedMessagePartTypes.has(type)) return;
  warnedMessagePartTypes.add(type);
  console.warn(`Unknown message part type: ${type}`);
};

const warnedMessageTypes = new Set<string>();
const warnForUnknownMessageType = (type: string) => {
  if (
    typeof process === "undefined" ||
    process?.env?.NODE_ENV !== "development"
  )
    return;
  if (warnedMessageTypes.has(type)) return;
  warnedMessageTypes.add(type);
  console.warn(`Unknown message type: ${type}`);
};

const contentToParts = (
  content: LangChainMessage["content"],
  metadata: LangGraphMessageConverterMetadata,
  messageId: string | undefined,
) => {
  if (content == null) return [];
  if (typeof content === "string")
    return [{ type: "text" as const, text: content }];
  return content
    .map(
      (
        part,
      ):
        | (ThreadUserMessage | ThreadAssistantMessage)["content"][number]
        | null => {
        if (part.type === "computer_call") {
          const args = part.action as ReadonlyJSONObject;
          return {
            type: "tool-call",
            toolCallId: part.call_id,
            toolName: "computer_call",
            args,
            argsText: stableStringifyToolArgs(
              metadata.toolArgsKeyOrderCache,
              getToolArgsCacheKey(messageId, "computer", part.call_id),
              args,
            ),
          };
        }

        const converted = convertLangChainContentBlock(part);
        if (converted === undefined) {
          warnForUnknownMessagePartType(part.type);
          return null;
        }
        return converted;
      },
    )
    .filter((a) => a !== null);
};

const normalizePayload = (value: string) => parseDataUrl(value)?.data ?? value;

const attachmentPartKey = (part: {
  type: string;
  image?: string;
  data?: unknown;
  audio?: { data: string };
}): string | null => {
  if (part.type === "image" && typeof part.image === "string")
    return `image:${normalizePayload(part.image)}`;
  if (part.type === "file" && typeof part.data === "string")
    return `file:${normalizePayload(part.data)}`;
  if (part.type === "audio" && part.audio)
    return `file:${normalizePayload(part.audio.data)}`;
  return null;
};

/**
 * getMessageContent flattens attachment content into the wire message while
 * the runtime reattaches the original attachments for chip rendering, so in
 * the sender's session each attachment payload arrives back twice. Drops the
 * flattened copies, at most one content part per attachment part, consuming
 * from the trailing end because getMessageContent appends the flattened
 * copies after the user's direct content; on reload the staging map is empty
 * and content parts pass through untouched.
 */
const dropAttachmentDuplicates = (
  parts: ReturnType<typeof contentToParts>,
  attachments: readonly CompleteAttachment[],
): ReturnType<typeof contentToParts> => {
  const counts = new Map<string, number>();
  for (const part of attachments.flatMap((a) => a.content)) {
    const key = attachmentPartKey(part);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return parts;
  const dropped = new Set<number>();
  for (let i = parts.length - 1; i >= 0; i--) {
    const key = attachmentPartKey(parts[i]!);
    if (!key) continue;
    const remaining = counts.get(key);
    if (!remaining) continue;
    counts.set(key, remaining - 1);
    dropped.add(i);
  }
  if (dropped.size === 0) return parts;
  return parts.filter((_, i) => !dropped.has(i));
};

export const convertLangChainMessages: useExternalMessageConverter.Callback<
  LangChainMessage
> = (message, metadata: LangGraphMessageConverterMetadata = {}) => {
  const type = message.type;
  switch (type) {
    case "system":
      return {
        role: "system",
        id: message.id,
        content: [{ type: "text", text: message.content }],
        metadata: { custom: getCustomMetadata(message.additional_kwargs) },
      };
    case "human": {
      const attachments = message.id
        ? metadata.attachmentsByMessageId?.get(message.id)
        : undefined;
      const parts = contentToParts(message.content, metadata, message.id);
      return {
        role: "user",
        id: message.id,
        content: attachments?.length
          ? dropAttachmentDuplicates(parts, attachments)
          : parts,
        metadata: { custom: getCustomMetadata(message.additional_kwargs) },
        ...(attachments?.length ? { attachments } : {}),
      };
    }
    case "ai": {
      const toolCallParts =
        message.tool_calls?.map((chunk, idx): ToolCallMessagePart => {
          const fallbackIndex = chunk.index ?? idx;
          const toolCallId = chunk.id
            ? chunk.id
            : `lc-toolcall-${message.id ?? "unknown"}-${fallbackIndex}`;
          const matchingToolCallChunk = message.tool_call_chunks?.find((c) =>
            chunk.id ? c.id === chunk.id : c.index === fallbackIndex,
          );
          const { args, argsText } = resolveToolCallArgs({
            chunk,
            matchingToolCallChunk,
            messageId: message.id,
            toolArgsKeyOrderCache: metadata.toolArgsKeyOrderCache,
            toolCallId,
          });

          return {
            type: "tool-call",
            toolCallId,
            toolName: chunk.name,
            args,
            argsText,
          };
        }) ?? [];

      const normalizedContent =
        typeof message.content === "string"
          ? [{ type: "text" as const, text: message.content }]
          : (message.content ?? []);

      const allContent = [
        message.additional_kwargs?.reasoning,
        ...normalizedContent,
        ...(message.additional_kwargs?.tool_outputs ?? []),
      ].filter((c) => c !== undefined);

      const uiDataParts: readonly DataMessagePart[] =
        (message.id
          ? metadata.uiMessagesByParent
              ?.get(message.id)
              ?.map(uiMessageToDataPart)
          : undefined) ?? [];

      const timing = message.id
        ? metadata.messageTiming?.[message.id]
        : undefined;

      return {
        role: "assistant",
        id: message.id,
        content: [
          ...withAudioTranscript(
            contentToParts(allContent, metadata, message.id),
            message.additional_kwargs,
          ),
          ...toolCallParts,
          ...uiDataParts,
        ],
        metadata: {
          custom: getCustomMetadata(message.additional_kwargs),
          ...(timing && { timing }),
        },
        ...(message.status && { status: message.status }),
      };
    }
    case "remove":
      return [];
    case "tool":
      return {
        role: "tool",
        toolName: message.name,
        toolCallId: message.tool_call_id,
        result: message.content,
        artifact: message.artifact,
        isError: message.status === "error",
      };
    default: {
      const _exhaustiveCheck: never = type;
      warnForUnknownMessageType(_exhaustiveCheck);
      return [];
    }
  }
};

export { getMessageContent } from "@assistant-ui/react-langchain/converter";
