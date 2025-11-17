"use client";

import { useExternalMessageConverter } from "@assistant-ui/react";
import { A2AMessage } from "./types";
import { ToolCallMessagePart } from "@assistant-ui/react";
import { ThreadUserMessage } from "@assistant-ui/react";

const contentToParts = (content: A2AMessage["content"]) => {
  if (typeof content === "string")
    return [{ type: "text" as const, text: content }];
  return content
    .map((part): ThreadUserMessage["content"][number] | null => {
      const type = part.type;
      switch (type) {
        case "text":
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
        case "data":
          // Convert data parts to text representation for display
          return {
            type: "text",
            text: `[Data: ${JSON.stringify(part.data)}]`,
          };
        default:
          return null;
      }
    })
    .filter((part): part is NonNullable<typeof part> => part !== null);
};

export const convertA2AMessages = (messages: A2AMessage[]) =>
  messages
    .map((message, index) => {
      const role = message.role;
      switch (role) {
        case "system":
          return {
            id: message.id ?? `${index}`,
            role: "system" as const,
            content: [{ type: "text" as const, text: message.content as string }],
          };

        case "user":
          return {
            id: message.id ?? `${index}`,
            role: "user" as const,
            content: contentToParts(message.content),
          };

        case "assistant": {
          const toolCallParts: ToolCallMessagePart[] =
            message.tool_calls?.map((toolCall) => ({
              type: "tool-call",
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              args: toolCall.args,
              argsText: toolCall.argsText,
            })) ?? [];

          return {
            id: message.id ?? `${index}`,
            role: "assistant" as const,
            content: [...contentToParts(message.content), ...toolCallParts],
            status: message.status,
          };
        }

        case "tool":
          return {
            id: message.id ?? `${index}`,
            role: "user" as const,
            content: [
              {
                type: "tool-result" as const,
                toolCallId: message.tool_call_id!,
                result: JSON.parse(message.content as string),
                isError: message.status?.type === "incomplete" &&
                  message.status?.reason === "error",
              },
            ],
          };

        default:
          const _exhaustiveCheck: never = role;
          throw new Error(`Unknown message role: ${_exhaustiveCheck}`);
      }
    })
    .filter((message): message is NonNullable<typeof message> => message !== null);

export const useA2AMessageConverter = (messages: A2AMessage[]) =>
  useExternalMessageConverter({
    callback: convertA2AMessages,
    messages,
  });
