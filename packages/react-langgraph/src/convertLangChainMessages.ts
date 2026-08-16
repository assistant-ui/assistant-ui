"use client";

import type {
  AppendMessage,
  CompleteAttachment,
  DataMessagePart,
  MessageTiming,
  ThreadAssistantMessage,
  ThreadUserMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import {
  httpUrlPattern,
  parseDataUrl,
  stableStringifyToolArgs,
  trackToolArgsKeyOrder,
} from "@assistant-ui/core/internal";
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

const uiMessageToDataPart = (ui: UIMessage): DataMessagePart => ({
  type: "data",
  name: ui.name,
  data: ui.props,
});

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

const getCustomMetadata = (
  additionalKwargs: Record<string, unknown> | undefined,
): Record<string, unknown> =>
  (additionalKwargs?.metadata as Record<string, unknown>) ?? {};

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
  if (typeof content === "string")
    return [{ type: "text" as const, text: content }];
  return content
    .map(
      (
        part,
      ):
        | (ThreadUserMessage | ThreadAssistantMessage)["content"][number]
        | null => {
        const type = part.type;
        switch (type) {
          case "text":
            return { type: "text", text: part.text };
          case "text_delta":
            return { type: "text", text: part.text };
          case "image_url": {
            const image =
              typeof part.image_url === "string"
                ? part.image_url
                : part.image_url?.url;
            if (!image) return null;
            return { type: "image", image };
          }
          case "file":
            return {
              type: "file",
              filename: part.metadata?.filename ?? "file",
              data:
                part.source_type === "url"
                  ? part.url
                  : part.source_type === "id"
                    ? part.id
                    : part.data,
              mimeType: part.mime_type ?? "application/octet-stream",
              ...((part.source_type === "url" || part.source_type === "id") && {
                sourceType: part.source_type,
              }),
            };

          case "audio": {
            const mimeType = part.mime_type ?? "application/octet-stream";
            const subtype = mimeType.startsWith("audio/")
              ? mimeType.slice("audio/".length)
              : undefined;
            return {
              type: "file" as const,
              filename: subtype ? `audio.${subtype}` : "audio",
              data: part.data,
              mimeType,
            };
          }

          case "thinking":
            return { type: "reasoning", text: part.thinking };

          case "reasoning":
            return {
              type: "reasoning",
              text:
                part.summary?.map((s) => s?.text ?? "").join("\n\n\n") ??
                part.reasoning ??
                "",
            };

          case "tool_use":
            return null;
          case "input_json_delta":
            return null;

          case "computer_call": {
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

          default: {
            const _exhaustiveCheck: never = type;
            warnForUnknownMessagePartType(_exhaustiveCheck);
            return null;
          }

          // const _exhaustiveCheck: never = type;
          // throw new Error(`Unknown message part type: ${_exhaustiveCheck}`);
        }
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

const hasVisibleText = (text: unknown): boolean =>
  typeof text === "string" && text.trim() !== "";

/**
 * Audio output arrives outside the content array: providers leave `content`
 * empty and put the spoken text in `additional_kwargs.audio.transcript`. The
 * audio bytes stay behind because no provider reports their media type, and a
 * streamed response carries raw PCM rather than a playable file.
 */
const withAudioTranscript = (
  parts: ReturnType<typeof contentToParts>,
  additionalKwargs: Extract<
    LangChainMessage,
    { type: "ai" }
  >["additional_kwargs"],
): ReturnType<typeof contentToParts> => {
  const transcript: unknown = additionalKwargs?.audio?.transcript;
  if (typeof transcript !== "string" || !hasVisibleText(transcript))
    return parts;
  if (parts.some((part) => part.type === "text" && hasVisibleText(part.text)))
    return parts;
  return [
    ...parts.filter((part) => part.type !== "text"),
    { type: "text" as const, text: transcript },
  ];
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
          : message.content;

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

/**
 * Audio media types that reach a provider's audio input through the LangChain
 * `audio` block. langchain-core derives OpenAI's `input_audio.format` by
 * splitting `mime_type` on `/`, and that format is a wav-or-mp3 enum, so
 * `audio/mpeg` passes the converter and is rejected at the provider.
 */
const audioBlockMimeTypes = new Map<string, "audio/mp3" | "audio/wav">([
  ["audio/mp3", "audio/mp3"],
  ["audio/mpeg", "audio/mp3"],
  ["audio/wav", "audio/wav"],
  ["audio/wave", "audio/wav"],
  ["audio/x-wav", "audio/wav"],
]);

export const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];

  const hasNonText = allContent.some(
    (part) =>
      part.type === "file" || part.type === "image" || part.type === "audio",
  );
  const hasText = allContent.some((part) => part.type === "text");
  if (hasNonText && !hasText) {
    allContent.unshift({ type: "text", text: " " });
  }

  const content = allContent.flatMap((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };
      case "file": {
        const metadata = { filename: part.filename ?? "file" };
        if (part.sourceType === "id") {
          return {
            type: "file" as const,
            id: part.data,
            mime_type: part.mimeType,
            filename: metadata.filename,
            metadata,
            source_type: "id" as const,
          };
        }
        if (part.sourceType === "url" || httpUrlPattern.test(part.data)) {
          return {
            type: "file" as const,
            url: part.data,
            mime_type: part.mimeType,
            filename: metadata.filename,
            metadata,
            source_type: "url" as const,
          };
        }
        const parsed = parseDataUrl(part.data);
        const audioMimeType = audioBlockMimeTypes.get(
          (parsed?.mimeType ?? part.mimeType).toLowerCase(),
        );
        if (audioMimeType) {
          return {
            type: "audio" as const,
            data: parsed?.data ?? part.data,
            mime_type: audioMimeType,
            source_type: "base64" as const,
          };
        }
        return {
          type: "file" as const,
          data: parsed?.data ?? part.data,
          mime_type: parsed?.mimeType ?? part.mimeType,
          filename: metadata.filename,
          metadata,
          source_type: "base64" as const,
        };
      }

      case "audio": {
        const parsed = parseDataUrl(part.audio.data);
        return {
          type: "audio" as const,
          data: parsed?.data ?? part.audio.data,
          mime_type: `audio/${part.audio.format}`,
          source_type: "base64" as const,
        };
      }

      case "data":
        return [];

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default: {
        const _exhaustiveCheck: "reasoning" | "source" | "generative-ui" = type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }

  return content;
};
