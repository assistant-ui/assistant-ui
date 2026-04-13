"use client";

import type { ToolCallMessagePart } from "@assistant-ui/core";
import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import type { AdkMessage, AdkMessageContentPart } from "./types";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "image"; image: string }
  | { type: "data"; name: string; data: unknown };

const contentToParts = (content: AdkMessage["content"]): ContentPart[] => {
  if (typeof content === "string")
    return [{ type: "text" as const, text: content }];

  return (content as AdkMessageContentPart[])
    .map((part): ContentPart | null => {
      switch (part.type) {
        case "text":
          return { type: "text", text: part.text };
        case "reasoning":
          return { type: "reasoning", text: part.text };
        case "image":
          return {
            type: "image",
            image: `data:${part.mimeType};base64,${part.data}`,
          };
        case "image_url":
          return { type: "image", image: part.url };
        case "code":
          return {
            type: "data",
            name: "executable_code",
            data: { code: part.code, language: part.language },
          };
        case "code_result":
          return {
            type: "data",
            name: "code_execution_result",
            data: { output: part.output, outcome: part.outcome },
          };
        default:
          return null;
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
};

export const convertAdkMessage: useExternalMessageConverter.Callback<
  AdkMessage
> = (message) => {
  switch (message.type) {
    case "human":
      return {
        role: "user",
        id: message.id,
        content: contentToParts(message.content),
      };

    case "ai": {
      const toolCallParts: ToolCallMessagePart[] =
        message.tool_calls?.map((tc) => ({
          type: "tool-call",
          toolCallId: tc.id,
          toolName: tc.name,
          args: tc.args,
          argsText: tc.argsText ?? JSON.stringify(tc.args),
        })) ?? [];

      return {
        role: "assistant",
        id: message.id,
        content: [...contentToParts(message.content), ...toolCallParts],
        ...(message.status && { status: message.status }),
        ...(message.author && {
          metadata: {
            custom: { author: message.author, branch: message.branch },
          },
        }),
      };
    }

    case "tool":
      return {
        role: "tool",
        toolCallId: message.tool_call_id,
        toolName: message.name,
        result: message.content,
        isError: message.status === "error",
      };
  }
};
