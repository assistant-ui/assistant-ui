"use client";

import { useExternalMessageConverter } from "@assistant-ui/react";
import type {
  MastraMessage,
  MastraContent,
  MastraToolResult,
  MastraImageContent,
  MastraFileContent,
  MastraMessageStatus,
} from "./types";
import type { MessageStatus } from "@assistant-ui/react";

const warnedMessagePartTypes = new Set<string>();
const warnForUnknownMessagePartType = (type: string) => {
  // Only warn in development mode
  if (
    typeof process === "undefined" ||
    process?.env?.["NODE_ENV"] !== "development"
  )
    return;
  if (warnedMessagePartTypes.has(type)) return;
  warnedMessagePartTypes.add(type);
  // Use console.warn only in development
  if (typeof console !== "undefined" && console.warn) {
    console.warn(`[Mastra] Unknown message part type: ${type}`);
  }
};

const convertMastraContentToParts = (
  content: string | MastraContent[] | null,
): any[] => {
  if (content === null || content === undefined) {
    return [];
  }
  if (typeof content === "string") {
    return [{ type: "text" as const, text: content }];
  }

  return content.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "reasoning":
        return { type: "reasoning" as const, reasoning: part.reasoning };
      case "tool_call":
        return {
          type: "tool_call" as const,
          tool_call: part.tool_call,
        };
      case "tool_result":
        return convertToolResultToMessagePart(part.tool_result);
      case "image":
        return convertImageToMessagePart(part.image);
      case "file":
        return convertFileToMessagePart(part.file);
      default:
        warnForUnknownMessagePartType(type);
        return { type: "text" as const, text: String(part) };
    }
  });
};

const convertToolResultToMessagePart = (toolResult: MastraToolResult) => {
  return {
    type: "tool_result" as const,
    tool_result: toolResult,
  };
};

const convertImageToMessagePart = (image: MastraImageContent) => {
  return {
    type: "image" as const,
    image: image.url,
    ...(image.detail && { detail: image.detail }),
    ...(image.mime_type && { mime_type: image.mime_type }),
  };
};

const convertFileToMessagePart = (file: MastraFileContent) => {
  return {
    type: "file" as const,
    name: file.name,
    url: file.url,
    ...(file.mime_type && { mime_type: file.mime_type }),
    ...(file.size && { size: file.size }),
  };
};

const mapMastraStatusToAssistantUI = (
  status?: MastraMessageStatus,
): MessageStatus => {
  switch (status) {
    case "running":
      return { type: "running" } as const;
    case "complete":
      return { type: "complete", reason: "stop" } as const;
    case "incomplete":
      return { type: "incomplete", reason: "error" } as const;
    case "requires-action":
      return { type: "requires-action", reason: "tool-calls" } as const;
    default:
      return { type: "complete", reason: "stop" } as const;
  }
};

// Simplified message converter for now
export const MastraMessageConverter = (message: MastraMessage) => {
  // Validate message has required fields
  if (!message.type) {
    // Default to user message if type is missing
    message = { ...message, type: "human" };
  }

  const role = (
    message.type === "human"
      ? "user"
      : message.type === "assistant"
        ? "assistant"
        : message.type
  ) as "system" | "assistant" | "user";

  const baseMessage = {
    id: message.id ?? crypto.randomUUID(),
    createdAt: new Date(message.timestamp ?? Date.now()),
    role,
    content: convertMastraContentToParts(message.content),
    // Only include status for assistant messages
    ...(role === "assistant" && {
      status: mapMastraStatusToAssistantUI(message.status),
    }),
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      // Only include steps for assistant messages
      ...(role === "assistant" && { steps: [] }),
      custom: message.metadata ?? {},
    },
  };

  // Handle special cases for different message types
  switch (message.type) {
    case "system":
      return {
        ...baseMessage,
        role: "system" as const,
        content: [
          {
            type: "text" as const,
            text: convertMastraContentToParts(message.content)
              .map((p) => ("text" in p ? p.text : ""))
              .join(""),
          },
        ],
      };

    case "tool": {
      const contentItem =
        Array.isArray(message.content) && message.content.length > 0
          ? message.content[0]
          : null;

      const toolResult =
        contentItem?.type === "tool_result" ? contentItem.tool_result : null;

      return {
        id: message.id ?? crypto.randomUUID(),
        createdAt: new Date(message.timestamp ?? Date.now()),
        role: "tool" as const,
        content: [],
        metadata: {
          toolCallId: toolResult?.tool_call_id,
          result: toolResult?.result,
        },
        toolCallId: toolResult?.tool_call_id,
        result: toolResult?.result,
      };
    }

    default:
      return baseMessage;
  }
};

// Legacy converter for backward compatibility
export const LegacyMastraMessageConverter: useExternalMessageConverter.Callback<
  MastraMessage
> = (message) => {
  const result = MastraMessageConverter(message);
  // The legacy converter expects to return the assistant-ui format directly
  return result as any;
};
