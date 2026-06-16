"use client";

import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { LangChainBaseMessage, LangChainContentBlock } from "./types";

export const getMessageType = (message: LangChainBaseMessage): string => {
  if (typeof message._getType === "function") return message._getType();
  if ("type" in message)
    return (message as Record<string, unknown>).type as string;
  throw new Error("Cannot determine message type");
};

type LangChainFileBlock = Extract<LangChainContentBlock, { type: "file" }>;

const contentFilePartToThreadPart = (
  part: LangChainFileBlock,
): {
  type: "file";
  filename: string;
  data: string;
  mimeType: string;
} | null => {
  if ("file" in part) {
    return {
      type: "file" as const,
      filename: part.file.filename,
      data: part.file.file_data,
      mimeType: part.file.mime_type,
    };
  }
  if ("data" in part && typeof part.data === "string") {
    return {
      type: "file" as const,
      filename: part.metadata?.filename ?? "file",
      data: part.data,
      mimeType: part.mime_type,
    };
  }
  if ("base64" in part && typeof part.base64 === "string") {
    return {
      type: "file" as const,
      filename: part.filename ?? "file",
      data: part.base64,
      mimeType: part.mime_type,
    };
  }
  return null;
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
          return { type: "image" as const, image: part.image_url.url };
        case "file":
          return contentFilePartToThreadPart(part);
        case "thinking":
          return { type: "reasoning" as const, text: part.thinking };
        case "reasoning":
          return {
            type: "reasoning" as const,
            text: part.summary.map((s) => s.text).join("\n\n\n"),
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
