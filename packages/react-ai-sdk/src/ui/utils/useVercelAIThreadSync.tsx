import type {
  TextContentPart,
  ThreadMessage,
  unstable_ToolCallContentPart as ToolCallContentPart,
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
  status: "in_progress" | "done" | "error",
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
    case "assistant":
      return {
        ...common,
        role: "assistant",
        content: messages.flatMap((message) => [
          ...(message.content
            ? [{ type: "text", text: message.content } as TextContentPart]
            : []),
          ...(message.toolInvocations?.map(
            (t) =>
              ({
                type: "tool-call",
                name: t.toolName,
                args: t.args,
                result: "result" in t ? t.result : undefined,
              }) as ToolCallContentPart,
          ) ?? []),
        ]),
        status,
      };
    default:
      throw new Error(
        `You have a message with an unsupported role. The role ${firstMessage.role} is not supported.`,
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
    if (message.role === "assistant") {
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
      const status =
        lastMessageId === messages[0].id && isRunning ? "in_progress" : "done";

      if (
        cache &&
        shallowArrayEqual(cache.content, messages) &&
        (cache.role === "user" || cache.status === status)
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
