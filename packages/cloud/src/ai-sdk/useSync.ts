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
};

/**
 * Synchronizes AI SDK useChat messages with Assistant Cloud.
 *
 * @example
 * ```tsx
 * const chat = useChat({ api: "/api/chat" });
 * const [threadId, selectThread, { isLoading }] = useSync(cloud, chat);
 * ```
 */
export function useSync(
  cloud: AssistantCloud,
  chat: UseSyncChat,
): UseSyncResult {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track which message IDs have been persisted
  const persistedIdsRef = useRef<Set<string>>(new Set());
  // Map local message IDs to cloud message IDs
  const localToRemoteIdRef = useRef<Map<string, string>>(new Map());
  // Track the last remote message ID for parent_id chaining
  const lastRemoteIdRef = useRef<string | null>(null);
  // Track if we're currently syncing to prevent re-entry
  const isSyncingRef = useRef(false);
  // Track the current threadId for the sync effect
  const currentThreadIdRef = useRef<string | null>(null);

  // Load messages when threadId changes
  useEffect(() => {
    currentThreadIdRef.current = threadId;

    if (threadId === null) {
      // Clear state for new thread
      chat.setMessages([]);
      persistedIdsRef.current = new Set();
      localToRemoteIdRef.current = new Map();
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

        // Decode messages and set them
        const messages = response.messages.map(decode);
        chat.setMessages(messages);

        // Mark all loaded messages as persisted
        persistedIdsRef.current = new Set(response.messages.map((m) => m.id));
        // Build the local→remote mapping (for loaded messages, local=remote)
        localToRemoteIdRef.current = new Map(
          response.messages.map((m) => [m.id, m.id]),
        );
        // Set the last remote ID for chaining
        const lastMessage = response.messages[response.messages.length - 1];
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

  // Persist new messages when they appear
  useEffect(() => {
    if (isSyncingRef.current) return;

    const newMessages = chat.messages.filter(
      (m) => !persistedIdsRef.current.has(m.id),
    );

    if (newMessages.length === 0) return;

    isSyncingRef.current = true;

    async function persistMessages() {
      try {
        for (const message of newMessages) {
          // Skip if already persisted (race condition check)
          if (persistedIdsRef.current.has(message.id)) continue;

          let targetThreadId = currentThreadIdRef.current;

          // Auto-create thread if needed
          if (targetThreadId === null) {
            const response = await cloud.threads.create({
              last_message_at: new Date(),
            });
            targetThreadId = response.thread_id;
            currentThreadIdRef.current = targetThreadId;
            setThreadId(targetThreadId);
          }

          // Persist the message
          const response = await cloud.threads.messages.create(targetThreadId, {
            parent_id: lastRemoteIdRef.current,
            format: MESSAGE_FORMAT,
            content: encode(message),
          });

          // Update tracking state
          persistedIdsRef.current.add(message.id);
          localToRemoteIdRef.current.set(message.id, response.message_id);
          lastRemoteIdRef.current = response.message_id;
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        isSyncingRef.current = false;
      }
    }

    persistMessages();
  }, [cloud, chat.messages]);

  const selectThread = useCallback((id: string | null) => {
    setThreadId(id);
    setError(null);
  }, []);

  return [threadId, selectThread, { isLoading, error }];
}
