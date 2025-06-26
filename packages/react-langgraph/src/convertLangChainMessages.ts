"use client";

import { useExternalMessageConverter } from "@assistant-ui/react";
import { LangChainMessage } from "./types";
import { ToolCallMessagePart } from "@assistant-ui/react";
import { ThreadUserMessage } from "@assistant-ui/react";

const contentToParts = (content: LangChainMessage["content"]) => {
  if (typeof content === "string")
    return [{ type: "text" as const, text: content }];
  return content
    .map((part): ThreadUserMessage["content"][number] | null => {
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

        case "tool_use":
          return null;
        case "input_json_delta":
          return null;
        default:
          const _exhaustiveCheck: never = type;
          throw new Error(`Unknown message part type: ${_exhaustiveCheck}`);
      }
    })
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
      };
    case "human":
      return {
        role: "user",
        id: message.id,
        content: contentToParts(message.content),
      };
    case "ai":
      return {
        role: "assistant",
        id: message.id,
        content: [
          ...contentToParts(message.content),
          ...(message.tool_calls?.map(
            (chunk): ToolCallMessagePart => ({
              type: "tool-call",
              toolCallId: chunk.id,
              toolName: chunk.name,
              args: chunk.args,
              argsText:
                message.tool_call_chunks?.find((c) => c.id === chunk.id)
                  ?.args ?? JSON.stringify(chunk.args),
            }),
          ) ?? []),
        ],
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
