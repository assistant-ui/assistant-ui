import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatInit } from "ai";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloud } from "../AssistantCloud";
import { CloudMessagePersistence } from "../CloudMessagePersistence";
import {
  createFormattedPersistence,
  type MessageFormatAdapter,
} from "../FormattedCloudPersistence";
import { encode, MESSAGE_FORMAT } from "./format";

const aiSdkFormatAdapter: MessageFormatAdapter<UIMessage, ReadonlyJSONObject> =
  {
    format: MESSAGE_FORMAT,
    encode: ({ message }) => encode(message),
    decode: (stored) => ({
      parentId: stored.parent_id,
      message: { id: stored.id, ...stored.content } as UIMessage,
    }),
    getId: (message) => message.id,
  };

export type UseCloudChatOptions = Omit<ChatInit<UIMessage>, "transport"> & {
  /** AssistantCloud instance */
  cloud: AssistantCloud;
  /** Current thread ID - controlled externally (e.g., from useThreads) */
  threadId: string | null;
  /** API endpoint for chat. Defaults to "/api/chat" */
  api?: string;
  /** Called when a new thread is created during send */
  onThreadCreated?: (threadId: string) => void;
};

export type UseCloudChatResult = UseChatHelpers<UIMessage> & {
  /** Sync error state */
  syncError: Error | null;
};

/**
 * Lightweight chat hook with automatic cloud persistence.
 *
 * This is a thin wrapper around AI SDK's `useChat` that adds cloud sync.
 * Use this when building custom UIs without assistant-ui components.
 *
 * **For the full assistant-ui experience**, use `useChatRuntime` from
 * `@assistant-ui/react-ai-sdk` instead - it provides optimistic updates,
 * integrated thread management, and all assistant-ui primitives.
 *
 * @example
 * ```tsx
 * const threads = useThreads({ cloud });
 * const chat = useCloudChat({
 *   cloud,
 *   threadId: threads.threadId,
 *   api: "/api/chat",
 *   onThreadCreated: (id) => {
 *     threads.refresh();
 *     threads.selectThread(id);
 *   },
 * });
 *
 * return (
 *   <div>
 *     {chat.messages.map(m => <Message key={m.id} message={m} />)}
 *     <button onClick={() => chat.sendMessage({ text: "Hello" })}>Send</button>
 *   </div>
 * );
 * ```
 */
export function useCloudChat(options: UseCloudChatOptions): UseCloudChatResult {
  const { cloud, threadId, api, onThreadCreated, ...chatOptions } = options;

  const persistenceByThreadRef = useRef(
    new Map<string, CloudMessagePersistence>(),
  );
  const formattedByThreadRef = useRef(
    new Map<
      string,
      ReturnType<
        typeof createFormattedPersistence<UIMessage, ReadonlyJSONObject>
      >
    >(),
  );
  const getPersistence = useCallback(
    (id: string) => {
      const existing = persistenceByThreadRef.current.get(id);
      if (existing) return existing;
      const created = new CloudMessagePersistence(cloud);
      persistenceByThreadRef.current.set(id, created);
      return created;
    },
    [cloud],
  );
  const getFormatted = useCallback(
    (id: string) => {
      const existing = formattedByThreadRef.current.get(id);
      if (existing) return existing;
      const created = createFormattedPersistence(
        getPersistence(id),
        aiSdkFormatAdapter,
      );
      formattedByThreadRef.current.set(id, created);
      return created;
    },
    [getPersistence],
  );
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Refs for latest values (avoid stale closures)
  const threadIdRef = useRef<string | null>(threadId);
  threadIdRef.current = threadId;
  const createdThreadRef = useRef<string | null>(null);
  const loadedThreadsRef = useRef(new Set<string>());
  const messagesByThreadRef = useRef(new Map<string, UIMessage[]>());
  const onThreadCreatedRef = useRef(onThreadCreated);
  onThreadCreatedRef.current = onThreadCreated;
  const onFinishRef = useRef(chatOptions?.onFinish);
  onFinishRef.current = chatOptions?.onFinish;

  // Track mounted state
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Internal transport with ensureThread via prepareSendMessagesRequest
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: api ?? "/api/chat",
        prepareSendMessagesRequest: async (opts) => {
          // Ensure thread exists before sending
          if (!threadIdRef.current && !createdThreadRef.current) {
            const res = await cloud.threads.create({
              last_message_at: new Date(),
            });
            createdThreadRef.current = res.thread_id;
            threadIdRef.current = res.thread_id;
            onThreadCreatedRef.current?.(res.thread_id);
          }
          // Return proper structure with body including messages
          const result: {
            body: object;
            headers?: HeadersInit;
            credentials?: RequestCredentials;
            api?: string;
          } = {
            body: {
              ...opts.body,
              id: opts.id,
              messages: opts.messages,
              trigger: opts.trigger,
              messageId: opts.messageId,
              metadata: opts.requestMetadata,
            },
          };
          if (opts.headers !== undefined) result.headers = opts.headers;
          if (opts.credentials !== undefined)
            result.credentials = opts.credentials;
          if (opts.api !== undefined) result.api = opts.api;
          return result;
        },
      }),
    [api, cloud],
  );

  const chat = useChat({
    ...chatOptions,
    transport,
    onFinish: (event) => {
      onFinishRef.current?.(event);
    },
  });

  // Store ref for chat state access in callbacks
  const setMessagesRef = useRef(chat.setMessages);
  setMessagesRef.current = chat.setMessages;

  const isRunning = chat.status === "submitted" || chat.status === "streaming";

  // Persist messages when not running, matching assistant-ui history semantics.
  useEffect(() => {
    const tid = threadIdRef.current ?? createdThreadRef.current;
    if (!tid || isRunning) return;

    const formatted = getFormatted(tid);
    const messages = chat.messages;

    messages.forEach((msg, idx) => {
      if (formatted.isPersisted(msg.id)) return;

      const parentId = idx > 0 ? messages[idx - 1]!.id : null;

      formatted.append(tid, { parentId, message: msg }).catch((err) => {
        if (mountedRef.current) {
          setSyncError(err instanceof Error ? err : new Error(String(err)));
        }
      });
    });
  }, [chat.messages, getFormatted, isRunning]);

  const loadThreadMessages = useCallback(
    async (id: string, cancelledRef: { cancelled: boolean }) => {
      const formatted = getFormatted(id);

      try {
        const { messages } = await formatted.load(id);
        if (cancelledRef.cancelled) return;

        const loaded = messages.map((item) => item.message);
        messagesByThreadRef.current.set(id, loaded);
        loadedThreadsRef.current.add(id);
        setMessagesRef.current(loaded);
      } catch (err) {
        if (cancelledRef.cancelled) return;
        setSyncError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [getFormatted],
  );

  useEffect(() => {
    const activeThreadId = threadIdRef.current ?? createdThreadRef.current;
    if (!activeThreadId) return;
    messagesByThreadRef.current.set(activeThreadId, chat.messages);
  }, [chat.messages]);

  // Load messages when threadId changes (explicit action, not observation).
  // Only fires on thread switch, not on isRunning transitions — matching
  // useExternalHistory's load-once-per-thread semantics.
  useEffect(() => {
    // Check if this is a thread we just created BEFORE any reset
    const justCreated = threadId === createdThreadRef.current;

    if (!justCreated) {
      createdThreadRef.current = null;
    }

    if (!threadId) {
      setMessagesRef.current([]);
      setSyncError(null);
      return;
    }

    const cached = messagesByThreadRef.current.get(threadId);
    if (cached) {
      setMessagesRef.current(cached);
      return;
    }

    if (loadedThreadsRef.current.has(threadId)) {
      return;
    }

    // Skip only for threads we just created (messages already in sync from send)
    if (justCreated) {
      return;
    }

    const cancelledRef = { cancelled: false };
    loadThreadMessages(threadId, cancelledRef);

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [threadId, loadThreadMessages]);

  return {
    ...chat,
    syncError,
  };
}
