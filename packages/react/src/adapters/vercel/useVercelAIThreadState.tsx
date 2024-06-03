import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  CreateThreadMessage,
  ThreadMessage,
  ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { MessageRepository, isOptimisticId } from "../MessageRepository";

type VercelThreadMessage = ThreadMessage & {
  innerMessage: Message; // TODO make this less hacky
};

const ThreadMessageCache = new WeakMap<Message, VercelThreadMessage>();
const vercelToThreadMessage = (
  message: Message,
  parentId: string | null,
): VercelThreadMessage => {
  if (message.role !== "user" && message.role !== "assistant")
    throw new Error("Unsupported role");

  return {
    parentId,
    id: message.id,
    role: message.role,
    content: [{ type: "text", text: message.content }],
    createdAt: message.createdAt ?? new Date(),
    innerMessage: message,
  };
};

const vercelToCachedThreadMessages = (messages: Message[]) => {
  return messages.map((m, idx) => {
    const cached = ThreadMessageCache.get(m);
    const parentId = messages[idx - 1]?.id ?? null;
    if (cached && cached.parentId === parentId) return cached;

    const newMessage = vercelToThreadMessage(m, parentId);
    ThreadMessageCache.set(m, newMessage);
    return newMessage;
  });
};

const sliceMessagesUntil = (messages: Message[], messageId: string | null) => {
  if (messageId == null) return [];
  if (isOptimisticId(messageId)) return messages; // TODO figure out if this is needed

  const messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1) throw new Error("Unexpected: Message not found");

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

  // for callbacks, we can use a ref to keep the callback reference stable
  const vercelRef = useRef(vercel);
  vercelRef.current = vercel;

  const isRunning = getIsRunning(vercelRef.current);

  const assistantOptimisticIdRef = useRef<string | null>(null);
  const messages = useMemo(() => {
    const vm = vercelToCachedThreadMessages(vercel.messages);
    for (const message of vm) {
      data.addOrUpdateMessage(message);
    }

    if (assistantOptimisticIdRef.current) {
      data.deleteMessage(assistantOptimisticIdRef.current);
      assistantOptimisticIdRef.current = null;
    }

    if (hasUpcomingMessage(isRunning, vm)) {
      assistantOptimisticIdRef.current = data.commitOptimisticRun(
        vm.at(-1)?.id ?? null,
      );
    }

    data.resetHead(assistantOptimisticIdRef.current ?? vm.at(-1)?.id ?? null);

    return data.getMessages();
  }, [data, isRunning, vercel.messages]);

  const getBranches = useCallback(
    (messageId: string) => {
      return data.getBranches(messageId);
    },
    [data],
  );

  const switchToBranch = useCallback(
    (messageId: string) => {
      data.switchToBranch(messageId);

      vercelRef.current.setMessages(
        (data.getMessages() as VercelThreadMessage[])
          .filter((m) => !isOptimisticId(m.id))
          .map((m) => m.innerMessage),
      );
    },
    [data],
  );

  const startRun = useCallback(async (parentId: string | null) => {
    const reloadMaybe =
      "reload" in vercelRef.current ? vercelRef.current.reload : undefined;
    if (!reloadMaybe)
      throw new Error("Reload not supported by Vercel AI SDK's useAssistant");

    const newMessages = sliceMessagesUntil(
      vercelRef.current.messages,
      parentId,
    );
    vercelRef.current.setMessages(newMessages);

    await reloadMaybe();
  }, []);

  const append = useCallback(async (message: CreateThreadMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported by Vercel AI SDK");

    const newMessages = sliceMessagesUntil(
      vercelRef.current.messages,
      message.parentId,
    );
    vercelRef.current.setMessages(newMessages);

    await vercelRef.current.append({
      role: "user",
      content: message.content[0].text,
    });
  }, []);

  const cancelRun = useCallback(() => {
    const lastMessage = vercelRef.current.messages.at(-1);
    vercelRef.current.stop();

    if (lastMessage?.role === "user") {
      vercelRef.current.setInput(lastMessage.content);
    }
  }, []);

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
