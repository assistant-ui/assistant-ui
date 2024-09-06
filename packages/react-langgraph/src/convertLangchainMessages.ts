"use client";

import { useExternalMessageConverter } from "@assistant-ui/react";
import { LangChainMessage } from "./types";
import { ToolCallContentPart } from "@assistant-ui/react";

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
      return {
        role: "user",
        id: message.id,
        content: [{ type: "text", text: message.content }],
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
