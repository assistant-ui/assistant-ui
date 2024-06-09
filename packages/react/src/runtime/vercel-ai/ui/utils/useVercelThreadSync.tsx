import type { Message } from "ai";
import { useEffect, useMemo } from "react";
import type {
  TextContentPart,
  ThreadMessage,
  ToolCallContentPart,
} from "../../../../utils/AssistantTypes";
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
  message: Message,
  status: "in_progress" | "done" | "error",
): VercelAIThreadMessage => {
  const common = {
    id: message.id,
    createdAt: message.createdAt ?? new Date(),
    [symbolInnerAIMessage]: message,
  };

  switch (message.role) {
    case "user":
      return {
        ...common,
        role: "user",
        content: [{ type: "text", text: message.content }],
      };
    case "assistant":
      return {
        ...common,
        role: "assistant",
        content: [
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
        ],
        status,
      };
    default:
      throw new Error(
        `You have a message with an unsupported role. The role ${message.role} is not supported.`,
      );
  }
};

type UpdateDataCallback = (isRunning: boolean, vm: ThreadMessage[]) => void;

export const useVercelThreadSync = (
  vercel: VercelHelpers,
  updateData: UpdateDataCallback,
) => {
  const isRunning = getIsRunning(vercel);

  const converter = useMemo(() => new ThreadMessageConverter(), []);
  const messages = useMemo(() => {
    const lastMessageId = vercel.messages.at(-1)?.id;
    const convertCallback: ConverterCallback<Message> = (message, cache) => {
      const status =
        lastMessageId === message.id && isRunning ? "in_progress" : "done";

      if (cache && (cache.role === "user" || cache.status === status))
        return cache;

      return vercelToThreadMessage(message, status);
    };

    return converter.convertMessages(convertCallback, vercel.messages);
  }, [isRunning, vercel.messages, converter]);

  useEffect(() => {
    updateData(isRunning, messages);
  }, [updateData, isRunning, messages]);
};
