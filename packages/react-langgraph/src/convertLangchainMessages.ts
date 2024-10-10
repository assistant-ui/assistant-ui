"use client";

import { useExternalMessageConverter } from "@assistant-ui/react";
import { LangChainMessage } from "./types";
import { ToolCallContentPart } from "@assistant-ui/react";
import { ThreadUserMessage } from "@assistant-ui/react";

export const convertLangchainMessages: useExternalMessageConverter.Callback<
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
      let content: ThreadUserMessage["content"];

      if (typeof message.content === "string") {
        content = [{ type: "text" as const, text: message.content }];
      } else {
        content = message.content.map((part) => {
          if (typeof part === "string") {
            return { type: "text", text: part };
          } else {
            const type = part.type;
            switch (type) {
              case "text":
                return { type: "text" as const, text: part.text };

              case "image_url":
                return {
                  type: "image" as const,
                  image:
                    typeof part.image_url === "string"
                      ? part.image_url
                      : part.image_url.url,
                };
              default:
                const unhandledType: never = type;
                throw new Error(
                  `Unhandled content part type: ${unhandledType}`,
                );
            }
          }
        });
      }

      return {
        role: "user",
        id: message.id,
        content,
      };
    case "ai":
      return {
        role: "assistant",
        id: message.id,
        content: [
          {
            type: "text",
            text: message.content,
          },
          ...(message.tool_calls?.map(
            (chunk): ToolCallContentPart => ({
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
      };
  }
};
