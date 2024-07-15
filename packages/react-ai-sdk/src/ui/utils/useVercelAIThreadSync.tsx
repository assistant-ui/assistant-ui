import type {
  TextContentPart,
  ThreadMessage,
  ToolCallContentPart,
  MessageStatus,
  ThreadAssistantMessage,
} from "@assistant-ui/react";
import type { Message } from "ai";
import { useEffect, useMemo } from "react";
import {
  type ConverterCallback,
  ThreadMessageConverter,
} from "../../utils/ThreadMessageConverter";
import {
  type VercelAIThreadMessage,
  symbolInnerAIMessage,
} from "../getVercelAIMessage";
import type { VercelHelpers } from "./VercelHelpers";

const getIsRunning = (vercel: VercelHelpers) => {
  if ("isLoading" in vercel) return vercel.isLoading;
  return vercel.status === "in_progress";
};

const vercelToThreadMessage = (
  messages: Message[],
  status: MessageStatus,
): VercelAIThreadMessage => {
  const firstMessage = messages[0];
  if (!firstMessage) throw new Error("No messages found");

  const common = {
    id: firstMessage.id,
    createdAt: firstMessage.createdAt ?? new Date(),
    [symbolInnerAIMessage]: messages,
  };

  switch (firstMessage.role) {
    case "user":
      if (messages.length > 1) {
        throw new Error(
          "Multiple user messages found. This is likely an internal bug in assistant-ui.",
        );
      }

      return {
        ...common,
        role: "user",
        content: [{ type: "text", text: firstMessage.content }],
      };

    case "system":
      return {
        ...common,
        role: "system",
        content: [{ type: "text", text: firstMessage.content }],
      };

    case "data":
    case "assistant": {
      const res: ThreadAssistantMessage = {
        ...common,
        role: "assistant",
        content: messages.flatMap((message) => {
          return [
            ...(message.content
              ? [{ type: "text", text: message.content } as TextContentPart]
              : []),
            ...(message.toolInvocations?.map(
              (t) =>
                ({
                  type: "tool-call",
                  toolName: t.toolName,
                  toolCallId: t.toolCallId,
                  argsText: JSON.stringify(t.args),
                  args: t.args,
                  result: "result" in t ? t.result : undefined,
                }) satisfies ToolCallContentPart,
            ) ?? []),
            ...(typeof message.data === "object" &&
            !Array.isArray(message.data) &&
            message.data?.["type"] === "tool-call"
              ? [message.data as ToolCallContentPart]
              : []),
          ];
        }),
        status,
      };

      for (const message of messages) {
        if (
          typeof message.data === "object" &&
          !Array.isArray(message.data) &&
          message.data?.["type"] === "tool-result"
        ) {
          const toolCallId = message.data["toolCallId"];
          const toolContent = res.content.find(
            (c) => c.type === "tool-call" && c.toolCallId === toolCallId,
          ) as ToolCallContentPart | undefined;
          if (!toolContent) throw new Error("Tool call not found");
          toolContent.result = message.data["result"];
        }
      }

      return res;
    }

    default:
      const _unsupported: "function" | "tool" = firstMessage.role;
      throw new Error(
        `You have a message with an unsupported role. The role ${_unsupported} is not supported.`,
      );
  }
};

type Chunk = [Message, ...Message[]];
const hasItems = (messages: Message[]): messages is Chunk =>
  messages.length > 0;

const chunkedMessages = (messages: Message[]): Chunk[] => {
  const chunks: Chunk[] = [];
  let currentChunk: Message[] = [];

  for (const message of messages) {
    if (message.role === "assistant" || message.role === "data") {
      currentChunk.push(message);
    } else {
      if (hasItems(currentChunk)) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
      chunks.push([message]);
    }
  }

  if (hasItems(currentChunk)) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const shallowArrayEqual = (a: unknown[], b: unknown[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

type UpdateDataCallback = (isRunning: boolean, vm: ThreadMessage[]) => void;

export const useVercelAIThreadSync = (
  vercel: VercelHelpers,
  updateData: UpdateDataCallback,
) => {
  const isRunning = getIsRunning(vercel);

  const converter = useMemo(() => new ThreadMessageConverter(), []);

  useEffect(() => {
    const lastMessageId = vercel.messages.at(-1)?.id;
    const convertCallback: ConverterCallback<Chunk> = (messages, cache) => {
      const status: MessageStatus =
        lastMessageId === messages[0].id && isRunning
          ? {
              type: "running",
            }
          : {
              type: "complete",
              finishReason: "unknown",
            };

      if (
        cache &&
        shallowArrayEqual(cache.content, messages) &&
        (cache.role !== "assistant" || cache.status.type === status.type)
      )
        return cache;

      return vercelToThreadMessage(messages, status);
    };

    const messages = converter.convertMessages(
      chunkedMessages(vercel.messages),
      convertCallback,
      (m) => m[0],
    );

    updateData(isRunning, messages);
  }, [updateData, isRunning, vercel.messages, converter]);
};
