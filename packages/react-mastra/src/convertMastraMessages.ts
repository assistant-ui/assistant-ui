"use client";

import type { MessageStatus, ToolCallMessagePart } from "@assistant-ui/core";
import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import type { MastraContent, MastraMessage, MastraToolResult } from "./types";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "image"; image: string }
  | { type: "file"; data: string; mimeType: string; filename?: string }
  | { type: "data"; name: string; data: unknown };

const mastraStatusToMessageStatus = (
  status: MastraMessage["status"] | undefined,
): MessageStatus | undefined => {
  switch (status) {
    case "running":
      return { type: "running" };
    case "incomplete":
      return { type: "incomplete", reason: "error" };
    case "requires-action":
      return { type: "requires-action", reason: "tool-calls" };
    case "complete":
      return { type: "complete", reason: "stop" };
    default:
      return undefined;
  }
};

const toolResultToContent = (toolResult: MastraToolResult): ContentPart => ({
  type: "data",
  name: "tool_result",
  data: toolResult,
});

const contentToParts = (
  content: MastraMessage["content"],
): Array<ContentPart | ToolCallMessagePart> => {
  if (typeof content === "string") return [{ type: "text", text: content }];

  return content.map(
    (part: MastraContent): ContentPart | ToolCallMessagePart => {
      switch (part.type) {
        case "text":
          return { type: "text", text: part.text };
        case "reasoning":
          return { type: "reasoning", text: part.text };
        case "tool_call":
          return {
            type: "tool-call",
            toolCallId: part.tool_call.id,
            toolName: part.tool_call.name,
            args: part.tool_call.arguments,
            argsText:
              part.tool_call.argsText ??
              JSON.stringify(part.tool_call.arguments),
            result: part.tool_call.result,
            isError: part.tool_call.status === "output-error",
          };
        case "tool_result":
          return toolResultToContent(part.tool_result);
        case "image":
          return { type: "image", image: part.url };
        case "file":
          return {
            type: "file",
            data: part.data,
            mimeType: part.mimeType,
            ...(part.filename != null && { filename: part.filename }),
          };
        case "data":
          return { type: "data", name: part.name, data: part.data };
      }
    },
  );
};

export const convertMastraMessage: useExternalMessageConverter.Callback<
  MastraMessage
> = (message) => {
  switch (message.type) {
    case "human":
      return {
        role: "user",
        id: message.id,
        content: contentToParts(message.content),
      };

    case "assistant": {
      const status = mastraStatusToMessageStatus(message.status);
      return {
        role: "assistant",
        id: message.id,
        content: contentToParts(message.content),
        ...(status && { status }),
        ...(message.metadata && { metadata: { custom: message.metadata } }),
      };
    }

    case "system":
      return {
        role: "system",
        id: message.id,
        content: contentToParts(message.content).filter(
          (part): part is ContentPart => part.type !== "tool-call",
        ),
      };

    case "tool": {
      let result: unknown = message.content;
      let isError = false;
      if (Array.isArray(message.content)) {
        const toolResult = message.content.find(
          (part): part is Extract<MastraContent, { type: "tool_result" }> =>
            part.type === "tool_result",
        )?.tool_result;
        if (toolResult) {
          result = toolResult.result ?? toolResult.error;
          isError = Boolean(toolResult.error);
        }
      }

      return {
        role: "tool",
        toolCallId: message.tool_call_id ?? "unknown",
        toolName: message.name,
        result,
        isError,
      };
    }
  }
};

export const MastraMessageConverter = {
  callback: convertMastraMessage,
};
