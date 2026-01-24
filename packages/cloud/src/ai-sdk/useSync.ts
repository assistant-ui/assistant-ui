import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import type { AssistantCloud } from "../AssistantCloud";
import { encode, decode, MESSAGE_FORMAT } from "./format";

export type UseSyncState = {
  isLoading: boolean;
  error: Error | null;
};

export type UseSyncResult = [
  threadId: string | null,
  selectThread: (id: string | null) => void,
  state: UseSyncState,
];

export type UseSyncChat = {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  status: "submitted" | "streaming" | "ready" | "error";
};

export type UseSyncOptions = {
  onThreadCreated?: (id: string) => void;
};

/**
 * Synchronizes AI SDK useChat messages with Assistant Cloud.
 *
 * @example
 * ```tsx
 * const chat = useChat();
 * const [threadId, selectThread] = useSync(cloud, chat, {
 *   onThreadCreated: () => threads.refresh(),
 * });
 * ```
 */
export function useSync(
  cloud: AssistantCloud,
  chat: UseSyncChat,
  options?: UseSyncOptions,
): UseSyncResult {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Refs for latest values (avoids stale closures in async functions)
  const messagesRef = useRef(chat.messages);
  messagesRef.current = chat.messages;
  const statusRef = useRef(chat.status);
  statusRef.current = chat.status;
  const setMessagesRef = useRef(chat.setMessages);
  setMessagesRef.current = chat.setMessages;
  const onThreadCreatedRef = useRef(options?.onThreadCreated);
  onThreadCreatedRef.current = options?.onThreadCreated;

  const persistedIdsRef = useRef<Set<string>>(new Set());
  const lastRemoteIdRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);
  const currentThreadIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Load messages when threadId changes
  useEffect(() => {
    currentThreadIdRef.current = threadId;

    if (threadId === null) {
      setMessagesRef.current([]);
      persistedIdsRef.current = new Set();
      lastRemoteIdRef.current = null;
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await cloud.threads.messages.list(threadId!, {
          format: MESSAGE_FORMAT,
        });

        if (cancelled) return;

        const sortedMessages = [...response.messages].sort(
          (a, b) => a.height - b.height,
        );
        const messages = sortedMessages.map(decode);
        setMessagesRef.current(messages);

        persistedIdsRef.current = new Set(sortedMessages.map((m) => m.id));
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        lastRemoteIdRef.current = lastMessage?.id ?? null;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [cloud, threadId]);

  // Persist new messages (deps trigger re-run, refs provide latest values in async code)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger deps
  useEffect(() => {
    if (isSyncingRef.current) return;

    const getPending = () => {
      const isStreaming =
        statusRef.current === "streaming" || statusRef.current === "submitted";
      return messagesRef.current.filter((m, i) => {
        if (persistedIdsRef.current.has(m.id)) return false;
        const isLast = i === messagesRef.current.length - 1;
        if (isLast && m.role === "assistant" && isStreaming) return false;
        return true;
      });
    };

    if (getPending().length === 0) return;
    isSyncingRef.current = true;

    async function persistMessages() {
      try {
        let pending = getPending();
        while (pending.length > 0) {
          for (const message of pending) {
            if (persistedIdsRef.current.has(message.id)) continue;
            if (!mountedRef.current) return;

            let targetThreadId = currentThreadIdRef.current;

            if (targetThreadId === null) {
              const res = await cloud.threads.create({
                last_message_at: new Date(),
              });
              targetThreadId = res.thread_id;
              currentThreadIdRef.current = targetThreadId;
              if (mountedRef.current) setThreadId(targetThreadId);
              onThreadCreatedRef.current?.(targetThreadId);
            }

            const res = await cloud.threads.messages.create(targetThreadId, {
              parent_id: lastRemoteIdRef.current,
              format: MESSAGE_FORMAT,
              content: encode(message),
            });

            persistedIdsRef.current.add(message.id);
            lastRemoteIdRef.current = res.message_id;
          }
          // Re-check for messages that arrived during persist
          pending = getPending();
        }
        isSyncingRef.current = false;
      } catch (err) {
        if (!mountedRef.current) {
          isSyncingRef.current = false;
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
        // Retry after delay — keep isSyncingRef true to block re-entry
        retryTimeoutRef.current = setTimeout(() => {
          isSyncingRef.current = false;
          if (mountedRef.current) setRetryTrigger((n) => n + 1);
        }, 2000);
      }
    }

    persistMessages();
  }, [cloud, chat.messages, chat.status, retryTrigger]);

  const selectThread = useCallback((id: string | null) => {
    setThreadId(id);
    setError(null);
  }, []);

  return [threadId, selectThread, { isLoading, error }];
}
