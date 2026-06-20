"use client";

import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import type { AppendMessage } from "@assistant-ui/core";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { LangChainBaseMessage, LangChainContentBlock } from "./types";

export const getMessageType = (message: LangChainBaseMessage): string => {
  if (typeof message._getType === "function") return message._getType();
  if ("type" in message)
    return (message as Record<string, unknown>).type as string;
  throw new Error("Cannot determine message type");
};

const contentToParts = (content: unknown) => {
  if (typeof content === "string")
    return [{ type: "text" as const, text: content }];

  const parts = content as readonly LangChainContentBlock[];
  return parts
    .map((part) => {
      const type = part.type;
      switch (type) {
        case "text":
        case "text_delta":
          return { type: "text" as const, text: part.text };
        case "image_url":
          if (typeof part.image_url === "string") {
            return { type: "image" as const, image: part.image_url };
          }
          return { type: "image" as const, image: part.image_url?.url };
        case "file":
          return {
            type: "file" as const,
            filename: part.metadata?.filename ?? "file",
            data: part.data,
            mimeType: part.mime_type,
          };
        case "thinking":
          return { type: "reasoning" as const, text: part.thinking };
        case "reasoning":
          return {
            type: "reasoning" as const,
            text:
              part.summary?.map((s) => s?.text ?? "").join("\n\n\n") ??
              part.reasoning ??
              "",
          };
        case "tool_use":
        case "input_json_delta":
          return null;
        default:
          return null;
      }
    })
    .filter((p) => p !== null);
};

const getCustomMetadata = (
  additionalKwargs: Record<string, unknown> | undefined,
): Record<string, unknown> =>
  (additionalKwargs?.metadata as Record<string, unknown>) ?? {};

const getStringContent = (content: unknown): string => {
  if (typeof content === "string") return content;
  const parts = content as readonly LangChainContentBlock[];
  return parts
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");
};

export const convertLangChainBaseMessage: useExternalMessageConverter.Callback<
  LangChainBaseMessage
> = (message) => {
  const type = getMessageType(message);

  switch (type) {
    case "system":
      return {
        role: "system",
        id: message.id,
        content: [{ type: "text", text: getStringContent(message.content) }],
        metadata: {
          custom: getCustomMetadata(message.additional_kwargs),
        },
      };

    case "human":
      return {
        role: "user",
        id: message.id,
        content: contentToParts(message.content),
        metadata: {
          custom: getCustomMetadata(message.additional_kwargs),
        },
      };

    case "ai": {
      const toolCallParts =
        message.tool_calls?.map((tc) => ({
          type: "tool-call" as const,
          toolCallId: tc.id,
          toolName: tc.name,
          args: tc.args as ReadonlyJSONObject,
          argsText: JSON.stringify(tc.args),
        })) ?? [];

      const assistantStatus =
        typeof message.status === "object" ? message.status : undefined;

      return {
        role: "assistant",
        id: message.id,
        content: [...contentToParts(message.content), ...toolCallParts],
        metadata: {
          custom: getCustomMetadata(message.additional_kwargs),
        },
        ...(assistantStatus && { status: assistantStatus }),
      };
    }

    case "tool":
      return {
        role: "tool",
        toolName: message.name ?? "",
        toolCallId: message.tool_call_id ?? "",
        result: message.content,
        artifact: message.artifact,
        isError: message.status === "error",
      };

    default:
      return {
        role: "system",
        id: message.id,
        content: [
          {
            type: "text",
            text:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
          },
        ],
      };
  }
};

export const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];

  const hasNonText = allContent.some(
    (part) => part.type === "file" || part.type === "image",
  );
  const hasText = allContent.some((part) => part.type === "text");
  if (hasNonText && !hasText) {
    allContent.unshift({ type: "text", text: " " });
  }

  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };
      case "file":
        return {
          type: "file" as const,
          data: part.data,
          mime_type: part.mimeType,
          metadata: { filename: part.filename ?? "file" },
          source_type: "base64" as const,
        };
      case "tool-call":
        throw new Error("Tool call appends are not supported.");
      default: {
        const _exhaustiveCheck:
          | "reasoning"
          | "source"
          | "audio"
          | "data"
          | "generative-ui" = type;
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
