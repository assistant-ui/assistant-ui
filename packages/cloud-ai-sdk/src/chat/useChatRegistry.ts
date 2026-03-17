import { useRef } from "react";
import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import { ChatRegistry } from "./ChatRegistry";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `aui_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

type UseChatRegistryOptions = {
  threadId: string | null;
  createChat: (chatKey: string, registry: ChatRegistry) => Chat<UIMessage>;
};

export function useChatRegistry({
  threadId,
  createChat,
}: UseChatRegistryOptions): {
  registry: ChatRegistry;
  activeChat: Chat<UIMessage>;
} {
  // Ref ensures registry always delegates to the latest createChat,
  // even if core is recreated (e.g. cloud identity change).
  const createChatRef = useRef(createChat);
  createChatRef.current = createChat;

  const registryRef = useRef<ChatRegistry | null>(null);
  if (!registryRef.current) {
    registryRef.current = new ChatRegistry((chatKey) =>
      createChatRef.current(chatKey, registryRef.current!),
    );
  }
  const registry = registryRef.current;

  const freshSessionKey = useRef<string | null>(null);
  if (!freshSessionKey.current) {
    freshSessionKey.current = createSessionId();
  }

  // When the user navigates away from a thread (threadId goes null),
  // generate a fresh session key so the next new-chat gets its own Chat instance.
  const prevThreadId = useRef<string | null>(threadId);
  if (threadId === null && prevThreadId.current !== null) {
    freshSessionKey.current = createSessionId();
  }
  prevThreadId.current = threadId;

  const activeChatKey = threadId
    ? (registry.getChatKeyForThread(threadId) ?? threadId)
    : (freshSessionKey.current ??
      (freshSessionKey.current = createSessionId()));

  const activeChat = registry.getOrCreate(activeChatKey, threadId);

  return { registry, activeChat };
}
