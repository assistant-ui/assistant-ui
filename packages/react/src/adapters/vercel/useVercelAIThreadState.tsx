import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { TextContentPart } from "../../../dist";
import type {
  AppendMessage,
  ThreadMessage,
  ThreadState,
  ToolCallContentPart,
} from "../../utils/context/stores/AssistantTypes";
import { MessageRepository } from "../MessageRepository";
import { ThreadMessageConverter } from "../ThreadMessageConverter";
import {
  type VercelThreadMessage,
  getVercelMessage,
  symbolInnerMessage,
} from "./VercelThreadMessage";

const vercelToThreadMessage = (
  message: Message,
  status: "in_progress" | "done" | "error",
): VercelThreadMessage => {
  const common = {
    id: message.id,
    createdAt: message.createdAt ?? new Date(),
    [symbolInnerMessage]: message,
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

const sliceMessagesUntil = (messages: Message[], messageId: string | null) => {
  if (messageId == null) return [];

  const messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1)
    throw new Error(
      "useVercelAIThreadState: Message not found. This is liekly an internal bug in assistant-ui.",
    );

  return messages.slice(0, messageIdx + 1);
};

const hasUpcomingMessage = (isRunning: boolean, messages: ThreadMessage[]) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

const getIsRunning = (vercel: UseChatHelpers | UseAssistantHelpers) => {
  if ("isLoading" in vercel) return vercel.isLoading;
  return vercel.status === "in_progress";
};

export const useVercelAIThreadState = (
  vercel: UseChatHelpers | UseAssistantHelpers,
): ThreadState => {
  const [data] = useState(() => new MessageRepository());

  const isRunning = getIsRunning(vercel);

  const convertCallback = useCallbackRef((message: Message) => {
    return vercelToThreadMessage(
      message,
      vercel.messages.at(-1) === message && isRunning ? "in_progress" : "done",
    );
  });

  const converter = new ThreadMessageConverter(convertCallback);

  const assistantOptimisticIdRef = useRef<string | null>(null);
  const messages = useMemo(() => {
    const vm = converter.convertMessages(vercel.messages);
    for (let i = 0; i < vm.length; i++) {
      const message = vm[i]!;
      const parent = vm[i - 1];
      data.addOrUpdateMessage(parent?.id ?? null, message);
    }

    if (assistantOptimisticIdRef.current) {
      data.deleteMessage(assistantOptimisticIdRef.current, null);
      assistantOptimisticIdRef.current = null;
    }

    if (hasUpcomingMessage(isRunning, vm)) {
      assistantOptimisticIdRef.current = data.appendOptimisticMessage(
        vm.at(-1)?.id ?? null,
        {
          role: "assistant",
          content: [{ type: "text", text: "" }],
        },
      );
    }

    data.resetHead(assistantOptimisticIdRef.current ?? vm.at(-1)?.id ?? null);

    return data.getMessages();
  }, [converter, data, isRunning, vercel.messages]);

  const getBranches = useCallback(
    (messageId: string) => {
      return data.getBranches(messageId);
    },
    [data],
  );

  const switchToBranch = useCallbackRef((messageId: string) => {
    data.switchToBranch(messageId);

    vercel.setMessages(
      (data.getMessages() as ThreadMessage[])
        .map(getVercelMessage)
        .filter((m): m is Message => m != null),
    );
  });

  const startRun = useCallbackRef(async (parentId: string | null) => {
    const reloadMaybe = "reload" in vercel ? vercel.reload : undefined;
    if (!reloadMaybe)
      throw new Error(
        "Reload is not supported by Vercel AI SDK's useAssistant.",
      );

    const newMessages = sliceMessagesUntil(vercel.messages, parentId);
    vercel.setMessages(newMessages);

    await reloadMaybe();
  });

  const append = useCallbackRef(async (message: AppendMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported by Vercel AI SDK.");

    const newMessages = sliceMessagesUntil(vercel.messages, message.parentId);
    vercel.setMessages(newMessages);

    await vercel.append({
      role: "user",
      content: message.content[0].text,
    });
  });

  const cancelRun = useCallbackRef(() => {
    const lastMessage = vercel.messages.at(-1);
    vercel.stop();

    if (lastMessage?.role === "user") {
      vercel.setInput(lastMessage.content);
    }
  });

  return useMemo(
    () => ({
      isRunning,
      messages,
      getBranches,
      switchToBranch,
      append,
      startRun,
      cancelRun,
    }),
    [
      isRunning,
      messages,
      getBranches,
      switchToBranch,
      append,
      startRun,
      cancelRun,
    ],
  );
};
