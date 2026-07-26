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
  const registryRef = useRef<ChatRegistry | null>(null);
  const freshSessionKey = useRef<string | null>(null);
  const prevThreadId = useRef<string | null>(threadId);
  const scopeRef = useRef(scope);

  if (scopeRef.current !== scope) {
    scopeRef.current = scope;
    registryRef.current = null;
    freshSessionKey.current = null;
    prevThreadId.current = threadId;
  }

  if (!registryRef.current) {
    registryRef.current = createRegistry(createChat);
  }
  const registry = registryRef.current;

  if (!freshSessionKey.current) {
    freshSessionKey.current = createSessionId();
  }

  // When the user navigates away from a thread (threadId goes null),
  // generate a fresh session key so the next new-chat gets its own Chat instance.
  if (threadId === null && prevThreadId.current !== null) {
    freshSessionKey.current = createSessionId();
  }
  prevThreadId.current = threadId;

  if (!threadId && !freshSessionKey.current) {
    freshSessionKey.current = createSessionId();
  }
  const activeChatKey = threadId
    ? (registry.getChatKeyForThread(threadId) ?? threadId)
    : freshSessionKey.current!;

  const activeChat = registry.getOrCreate(activeChatKey, threadId);

  return { registry, activeChat };
}
