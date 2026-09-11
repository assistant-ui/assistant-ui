"use client";

import type { MessageTiming } from "@assistant-ui/core";
import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import {
  convertLangChainContentBlock,
  getCustomMetadata,
  uiMessageToDataPart,
  withAudioTranscript,
} from "./converter";
import type {
  LangChainBaseMessage,
  LangChainContentBlock,
  UIMessage,
} from "./types";

type LangChainMessageConverterMetadata =
  useExternalMessageConverter.Metadata & {
    uiMessagesByParent?: Map<string, UIMessage[]>;
    messageTiming?: Record<string, MessageTiming>;
  };

const warnedMalformedMessages = new Set<string>();
const warnOnceInDevelopment = (message: string) => {
  if (
    typeof process === "undefined" ||
    process?.env?.NODE_ENV !== "development"
  )
    return;
  if (warnedMalformedMessages.has(message)) return;
  warnedMalformedMessages.add(message);
  console.warn(message);
};

export const getMessageType = (message: LangChainBaseMessage): string => {
  if (typeof message._getType === "function") return message._getType();
  if ("type" in message)
    return (message as Record<string, unknown>).type as string;
  warnOnceInDevelopment(
    "Cannot determine message type; rendering the message as system text",
  );
  return "unknown";
};

const contentBlocks = (content: unknown): readonly LangChainContentBlock[] => {
  if (content == null) return [];
  if (Array.isArray(content))
    return content.filter(
      (block) => typeof block === "object" && block !== null,
    );
  warnOnceInDevelopment(
    `Ignoring message content that is neither a string nor an array: ${typeof content}`,
  );
  return [];
};

const contentToParts = (content: unknown) => {
  if (typeof content === "string")
    return [{ type: "text" as const, text: content }];

  return contentBlocks(content)
    .map(convertLangChainContentBlock)
    .filter((part) => part !== null && part !== undefined);
};

const getStringContent = (content: unknown): string => {
  if (typeof content === "string") return content;
  return contentBlocks(content)
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");
};

export const convertLangChainBaseMessage = (
  message: LangChainBaseMessage,
  metadata: LangChainMessageConverterMetadata = {},
): useExternalMessageConverter.Message => {
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

      const uiDataParts =
        (message.id
          ? metadata.uiMessagesByParent
              ?.get(message.id)
              ?.map(uiMessageToDataPart)
          : undefined) ?? [];

      const timing = metadata.messageTiming?.[message.id ?? ""];

      return {
        role: "assistant",
        id: message.id,
        content: [
          ...withAudioTranscript(
            contentToParts(message.content),
            message.additional_kwargs,
          ),
          ...toolCallParts,
          ...uiDataParts,
        ],
        metadata: {
          custom: getCustomMetadata(message.additional_kwargs),
          ...(timing && { timing }),
        },
        ...(assistantStatus && { status: assistantStatus }),
      };
    }

    case "tool":
      return {
        role: "tool",
        // `joinExternalMessages` only checks the name against the tool call
        // when it is non-null, so an empty name manufactures a mismatch.
        toolName: message.name || undefined,
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
                : (JSON.stringify(message.content) ?? ""),
          },
        ],
      };
  }
};

export { getMessageContent } from "./converter";
