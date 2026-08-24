import { useEffect, useMemo, useRef } from "react";
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
  scope: object;
  threadId: string | null;
  createChat: (chatKey: string, registry: ChatRegistry) => Chat<UIMessage>;
};

function createRegistry(
  createChat: UseChatRegistryOptions["createChat"],
): ChatRegistry {
  let registry: ChatRegistry;
  registry = new ChatRegistry((chatKey) => createChat(chatKey, registry));
  return registry;
}

export function useChatRegistry({
  scope,
  threadId,
  createChat,
}: UseChatRegistryOptions): {
  registry: ChatRegistry;
  activeChat: Chat<UIMessage>;
} {
  const scopedRegistry = useMemo(
    () => ({ scope, registry: createRegistry(createChat) }),
    [scope, createChat],
  );
  const registry = scopedRegistry.registry;
  const isNewThread = threadId === null;
  const freshSession = useMemo(
    () => ({ scope, isNewThread, key: createSessionId() }),
    [scope, isNewThread],
  );
  const activeChatKey = threadId
    ? (registry.getChatKeyForThread(threadId) ?? threadId)
    : freshSession.key;

  const activeChat = registry.getOrCreate(activeChatKey, threadId);

  const committedRegistryRef = useRef(registry);
  useEffect(() => {
    const previousRegistry = committedRegistryRef.current;
    committedRegistryRef.current = registry;
    if (previousRegistry !== registry) {
      void previousRegistry.stopAll();
    }
  }, [registry]);

  return { registry, activeChat };
}
