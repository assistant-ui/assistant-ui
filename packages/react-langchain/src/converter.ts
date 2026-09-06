import type {
  AppendMessage,
  DataMessagePart,
  ThreadAssistantMessage,
  ThreadUserMessage,
} from "@assistant-ui/core";
import {
  parseDataUrl,
  resolveFilePartSource,
} from "@assistant-ui/core/internal";
import type { StreamingTimingAccessors } from "@assistant-ui/core/react";

/** Known content block types from @langchain/core messages. */
export type LangChainContentBlock =
  | { type: "text"; text: string }
  | { type: "text_delta"; text: string }
  | { type: "image_url"; image_url: string | { url?: string } }
  | { type: "thinking"; thinking: string }
  | {
      type: "reasoning";
      summary?: Array<{ type: "summary_text"; text?: string }>;
      reasoning?: string;
    }
  | {
      type: "file";
      data: string;
      mime_type: string;
      source_type?: "base64";
      metadata?: { filename?: string };
    }
  | {
      type: "file";
      url: string;
      mime_type?: string;
      source_type: "url";
      metadata?: { filename?: string };
    }
  | {
      type: "file";
      id: string;
      mime_type?: string;
      source_type: "id";
      metadata?: { filename?: string };
    }
  | {
      type: "audio";
      data: string;
      mime_type: string;
      source_type: "base64";
    }
  | { type: "tool_use" | "input_json_delta" };

type ConvertedContentPart =
  | ThreadUserMessage["content"][number]
  | ThreadAssistantMessage["content"][number];

export const convertLangChainContentBlock = (
  part: LangChainContentBlock,
): ConvertedContentPart | null | undefined => {
  const type = part.type;
  switch (type) {
    case "text":
    case "text_delta":
      return { type: "text" as const, text: part.text };
    case "image_url": {
      const image =
        typeof part.image_url === "string"
          ? part.image_url
          : part.image_url?.url;
      if (!image) return null;
      return { type: "image" as const, image };
    }
    case "file":
      return {
        type: "file" as const,
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
      return hasVisibleText(part.thinking)
        ? { type: "reasoning" as const, text: part.thinking }
        : null;
    case "reasoning": {
      const text = getReasoningText(part);
      return text ? { type: "reasoning" as const, text } : null;
    }
    case "tool_use":
    case "input_json_delta":
      return null;
    default:
      return undefined;
  }
};

const hasVisibleText = (text: unknown): boolean =>
  typeof text === "string" && text.trim() !== "";

/**
 * Audio output arrives outside the content array: providers leave `content`
 * empty and put the spoken text in `additional_kwargs.audio.transcript`. The
 * audio bytes stay behind because no provider reports their media type, and a
 * streamed response carries raw PCM rather than a playable file.
 */
export const withAudioTranscript = <T extends { type: string; text?: unknown }>(
  parts: readonly T[],
  additionalKwargs: Record<string, unknown> | undefined,
): readonly (T | { type: "text"; text: string })[] => {
  const audio = additionalKwargs?.audio as { transcript?: unknown } | undefined;
  const transcript = audio?.transcript;
  if (typeof transcript !== "string" || !hasVisibleText(transcript))
    return parts;
  if (parts.some((part) => part.type === "text" && hasVisibleText(part.text)))
    return parts;
  return [
    ...parts.filter((part) => part.type !== "text"),
    { type: "text" as const, text: transcript },
  ];
};

export const getCustomMetadata = (
  additionalKwargs: Record<string, unknown> | undefined,
): Record<string, unknown> =>
  (additionalKwargs?.metadata as Record<string, unknown>) ?? {};

export const uiMessageToDataPart = <
  TUIMessage extends { name: string; props: Record<string, unknown> },
>(
  ui: TUIMessage,
): DataMessagePart => ({
  type: "data",
  name: ui.name,
  data: ui.props,
});

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
        const source = resolveFilePartSource(part);
        if (source.kind === "url") {
          return {
            type: "file" as const,
            url: source.url,
            mime_type: part.mimeType,
            filename: metadata.filename,
            metadata,
            source_type: "url" as const,
          };
        }
        const audioMimeType = audioBlockMimeTypes.get(
          source.mimeType.toLowerCase(),
        );
        if (audioMimeType) {
          return {
            type: "audio" as const,
            data: source.data,
            mime_type: audioMimeType,
            source_type: "base64" as const,
          };
        }
        return {
          type: "file" as const,
          data: source.data,
          mime_type: source.mimeType,
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

const getReasoningText = (part: {
  readonly summary?: ReadonlyArray<{ readonly text?: string }>;
  readonly reasoning?: string;
}): string => {
  const summary = part.summary?.map((s) => s?.text ?? "").join("\n\n\n") ?? "";
  if (hasVisibleText(summary)) return summary;
  const reasoning = part.reasoning ?? "";
  return hasVisibleText(reasoning) ? reasoning : "";
};

export const createLangChainStreamingTimingAccessors = <
  TMessage extends {
    id?: string | undefined;
    content?: unknown;
    tool_calls?: readonly unknown[] | undefined;
  },
>(
  getType: (message: TMessage) => string,
): StreamingTimingAccessors<TMessage> => {
  const findAiMessage = (
    messages: readonly TMessage[],
    messageId: string,
  ): TMessage | undefined =>
    messages.find(
      (message) => getType(message) === "ai" && message.id === messageId,
    );

  const getTextLength = (
    messages: readonly TMessage[],
    messageId: string,
  ): number => {
    const message = findAiMessage(messages, messageId);
    if (!message) return 0;
    const content = message.content;
    if (typeof content === "string") return content.length;
    if (!Array.isArray(content)) return 0;
    let len = 0;
    for (const part of content as readonly LangChainContentBlock[]) {
      switch (part.type) {
        case "text":
        case "text_delta":
          if (typeof part.text === "string") len += part.text.length;
          break;
        case "thinking":
          if (hasVisibleText(part.thinking)) len += part.thinking.length;
          break;
        case "reasoning":
          len += getReasoningText(part).length;
          break;
      }
    }
    return len;
  };

  const getToolCallCount = (
    messages: readonly TMessage[],
    messageId: string,
  ): number => findAiMessage(messages, messageId)?.tool_calls?.length ?? 0;

  const getAssistantMessageId = (
    messages: readonly TMessage[],
  ): string | undefined => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message && getType(message) === "ai" && message.id) return message.id;
    }
    return undefined;
  };

  return {
    getAssistantMessageId,
    getTextLength,
    getToolCallCount,
  };
};

/**
 * Resolve the assistant message a `UIMessage` belongs to: the parent id comes
 * from `metadata.message_id` (Python SDK) or `metadata.id` (JS SDK).
 */
export const getUIMessageParentId = (ui: {
  metadata?: { message_id?: string; id?: string } | undefined;
}): string | undefined => ui.metadata?.message_id ?? ui.metadata?.id;

/**
 * Group the graph's accumulated `UIMessage`s by the assistant message they
 * belong to. Non-array state and entries without a parent link are dropped.
 */
export const groupUIMessagesByParent = <
  T extends {
    metadata?: { message_id?: string; id?: string } | undefined;
  },
>(
  value: unknown,
): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  if (!Array.isArray(value)) return map;
  for (const ui of value as T[]) {
    const parentId = getUIMessageParentId(ui);
    if (!parentId) continue;
    const existing = map.get(parentId);
    if (existing) {
      existing.push(ui);
    } else {
      map.set(parentId, [ui]);
    }
  }
  return map;
};
