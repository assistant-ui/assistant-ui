"use client";

import {
  ThreadAssistantMessage,
  useExternalMessageConverter,
} from "@assistant-ui/react";
import { LangChainMessage } from "./types";
import { ToolCallMessagePart } from "@assistant-ui/react";
import { ThreadUserMessage } from "@assistant-ui/react";
import {
  parsePartialJsonObject,
  ReadonlyJSONObject,
} from "assistant-stream/utils";

const getCustomMetadata = (
  additionalKwargs: Record<string, unknown> | undefined,
): Record<string, unknown> =>
  (additionalKwargs?.metadata as Record<string, unknown>) ?? {};

const warnedMessagePartTypes = new Set<string>();
const warnForUnknownMessagePartType = (type: string) => {
  if (
    typeof process === "undefined" ||
    process?.env?.["NODE_ENV"] !== "development"
  )
    return;
  if (warnedMessagePartTypes.has(type)) return;
  warnedMessagePartTypes.add(type);
  console.warn(`Unknown message part type: ${type}`);
};

const contentToParts = (content: LangChainMessage["content"]) => {
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
          case "image_url":
            if (typeof part.image_url === "string") {
              return { type: "image", image: part.image_url };
            } else {
              return {
                type: "image",
                image: part.image_url.url,
              };
            }
          case "file":
            return {
              type: "file",
              filename: part.file.filename,
              data: part.file.file_data,
              mimeType: part.file.mime_type,
            };

          case "thinking":
            return { type: "reasoning", text: part.thinking };

          case "reasoning":
            return {
              type: "reasoning",
              text: part.summary.map((s) => s.text).join("\n\n\n"),
            };

          case "tool_use":
            return null;
          case "input_json_delta":
            return null;

          case "computer_call":
            return {
              type: "tool-call",
              toolCallId: part.call_id,
              toolName: "computer_call",
              args: part.action as ReadonlyJSONObject,
              argsText: JSON.stringify(part.action),
            };

          default:
            const _exhaustiveCheck: never = type;
            warnForUnknownMessagePartType(_exhaustiveCheck);
            return null;

          // const _exhaustiveCheck: never = type;
          // throw new Error(`Unknown message part type: ${_exhaustiveCheck}`);
        }
      },
    )
    .filter((a) => a !== null);
};

export const convertLangChainMessages: useExternalMessageConverter.Callback<
  LangChainMessage
> = (message) => {
  switch (message.type) {
    case "system":
      return {
        role: "system",
        id: message.id,
        content: [{ type: "text", text: message.content }],
        metadata: { custom: getCustomMetadata(message.additional_kwargs) },
      };
    case "human":
      return {
        role: "user",
        id: message.id,
        content: contentToParts(message.content),
        metadata: { custom: getCustomMetadata(message.additional_kwargs) },
      };
    case "ai":
      const toolCallParts =
        message.tool_calls?.map((chunk): ToolCallMessagePart => {
          const argsText =
            chunk.partial_json ??
            message.tool_call_chunks?.find((c) => c.id === chunk.id)?.args ??
            JSON.stringify(chunk.args);

          return {
            type: "tool-call",
            toolCallId: chunk.id,
            toolName: chunk.name,
            args: argsText
              ? (parsePartialJsonObject(argsText) ?? {})
              : chunk.args,
            argsText: argsText ?? JSON.stringify(chunk.args),
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

      return {
        role: "assistant",
        id: message.id,
        content: [...contentToParts(allContent), ...toolCallParts],
        metadata: { custom: getCustomMetadata(message.additional_kwargs) },
        ...(message.status && { status: message.status }),
      };
    case "tool":
      return {
        role: "tool",
        toolName: message.name,
        toolCallId: message.tool_call_id,
        result: message.content,
        artifact: message.artifact,
        isError: message.status === "error",
      };
  }
};
