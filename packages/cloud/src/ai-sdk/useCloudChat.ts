"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatInit, type ChatTransport } from "ai";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { AssistantCloud } from "../AssistantCloud";
import { CloudMessagePersistence } from "../CloudMessagePersistence";
import {
  createFormattedPersistence,
  type MessageFormatAdapter,
} from "../FormattedCloudPersistence";
import { encode, MESSAGE_FORMAT } from "./format";
import { useThreads, type UseThreadsResult } from "./useThreads";

const createSessionId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `aui_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

// Module-level singleton for auto-cloud to ensure all components share the same instance
const autoCloudBaseUrl =
  typeof process !== "undefined"
    ? process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]
    : undefined;
const autoCloud = autoCloudBaseUrl
  ? new AssistantCloud({ baseUrl: autoCloudBaseUrl, anonymous: true })
  : undefined;

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

export type ThreadsConfig = {
  /** Include archived threads in the list. Default: false */
  includeArchived?: boolean;
  /** Auto-generate title after first response on new threads. Default: true */
  autoGenerateTitle?: boolean;
};

export type UseCloudChatOptions = ChatInit<UIMessage> & {
  /** Thread configuration or external thread management. If UseThreadsResult provided, internal threads are disabled. */
  threads?: UseThreadsResult | ThreadsConfig;
  /** Cloud instance. Ignored if threads is UseThreadsResult. Falls back to NEXT_PUBLIC_ASSISTANT_BASE_URL env var. */
  cloud?: AssistantCloud;
  /** Callback invoked when a sync error occurs. */
  onSyncError?: (error: Error) => void;
};

export type UseCloudChatResult = UseChatHelpers<UIMessage> & {
  /** Thread management (internal or passed-through) */
  threads: UseThreadsResult;
};

function isUseThreadsResult(
  value: UseThreadsResult | ThreadsConfig | undefined,
): value is UseThreadsResult {
  return (
    value !== undefined &&
    typeof (value as UseThreadsResult).selectThread === "function"
  );
}

/**
 * Wraps AI SDK's `useChat` with automatic cloud persistence and thread management.
 *
 * Messages are persisted as they complete. Threads are created automatically on first message.
 *
 * Supports zero-config (via `NEXT_PUBLIC_ASSISTANT_BASE_URL` env var), custom cloud instances,
 * thread configuration, and external thread management via `useThreads()`.
 */
export function useCloudChat(
  options: UseCloudChatOptions = {},
): UseCloudChatResult {
  const {
    threads: threadsOption,
    cloud: cloudOption,
    onSyncError,
    transport: userTransport,
    ...chatOptions
  } = options;

  const externalThreads = isUseThreadsResult(threadsOption)
    ? threadsOption
    : undefined;
  const threadsConfig = !isUseThreadsResult(threadsOption)
    ? threadsOption
    : undefined;

  const includeArchived = threadsConfig?.includeArchived ?? false;
  const autoGenerateTitle = threadsConfig?.autoGenerateTitle ?? true;

  // Resolve cloud: external threads' cloud > cloudOption > env var auto-cloud (singleton)
  const resolvedCloud = useMemo(() => {
    if (externalThreads) return externalThreads.cloud;
    if (cloudOption) return cloudOption;
    if (!autoCloud) {
      throw new Error(
        "useCloudChat: No cloud configured. Either:\n" +
          "1. Set NEXT_PUBLIC_ASSISTANT_BASE_URL environment variable, or\n" +
          "2. Pass a cloud instance: useCloudChat({ cloud }), or\n" +
          "3. Pass threads from useThreads: useCloudChat({ threads })",
      );
    }
    return autoCloud;
  }, [externalThreads, cloudOption]);

  // Always call useThreads (Rules of Hooks) but disable when external provided
  const internalThreads = useThreads({
    cloud: resolvedCloud,
    includeArchived: includeArchived ?? false,
    enabled: !externalThreads, // Skip fetch if user manages threads
  });

  // Use external if provided, otherwise internal
  const threads = externalThreads ?? internalThreads;
  const { cloud, threadId } = threads;

  // Keep a ref to threads for use in callbacks
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

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
  // Refs for latest values (avoid stale closures)
  const threadIdRef = useRef<string | null>(threadId);
  threadIdRef.current = threadId;
  const createdThreadRef = useRef<string | null>(null);
  const loadedThreadsRef = useRef(new Set<string>());
  const messagesByThreadRef = useRef(new Map<string, UIMessage[]>());
  const onFinishRef = useRef(chatOptions?.onFinish);
  onFinishRef.current = chatOptions?.onFinish;

  const onSyncErrorRef = useRef(onSyncError);
  onSyncErrorRef.current = onSyncError;

  const handleSyncError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    onSyncErrorRef.current?.(error);
  }, []);

  // For auto-title generation: track newly created threads
  const newlyCreatedThreadRef = useRef<string | null>(null);
  const titleGeneratedRef = useRef(new Set<string>());

  // Mutex for thread creation to prevent race conditions on concurrent sends
  const creatingThreadRef = useRef<Promise<string> | null>(null);

  // Track mounted state
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const baseTransportRef = useRef(
    userTransport ?? new DefaultChatTransport({}),
  );
  baseTransportRef.current = userTransport ?? new DefaultChatTransport({});

  const transport = useMemo<ChatTransport<UIMessage>>(
    () => ({
      sendMessages: async (opts) => {
        // Use threadsRef for most up-to-date threadId (handles rapid selectThread -> sendMessage)
        const currentThreadId =
          threadsRef.current.threadId ?? threadIdRef.current;

        // Ensure thread exists before sending (with mutex to prevent race conditions)
        if (!currentThreadId && !createdThreadRef.current) {
          if (!creatingThreadRef.current) {
            creatingThreadRef.current = (async () => {
              try {
                const res = await threadsRef.current.cloud.threads.create({
                  last_message_at: new Date(),
                });
                createdThreadRef.current = res.thread_id;
                threadIdRef.current = res.thread_id;
                loadedThreadsRef.current.add(res.thread_id);
                newlyCreatedThreadRef.current = res.thread_id;
                threadsRef.current.selectThread(res.thread_id);
                threadsRef.current.refresh();
                return res.thread_id;
              } catch (err) {
                creatingThreadRef.current = null;
                throw err;
              }
            })();
          }
          await creatingThreadRef.current;
        }

        const resolvedThreadId = currentThreadId ?? createdThreadRef.current;

        return await baseTransportRef.current.sendMessages({
          ...opts,
          body: {
            ...opts.body,
            id: resolvedThreadId ?? opts.chatId,
          },
        });
      },
      reconnectToStream: (opts) =>
        baseTransportRef.current.reconnectToStream(opts),
    }),
    [],
  );

  // Keep a stable chat session ID for the lifetime of this hook instance.
  const chatSessionIdRef = useRef<string | null>(null);
  if (!chatSessionIdRef.current) {
    chatSessionIdRef.current = createSessionId();
  }

  const chat = useChat({
    ...chatOptions,
    id: chatSessionIdRef.current,
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

    const persist = async () => {
      const formatted = getFormatted(tid);
      const messages = chat.messages;

      const appendTasks = messages.map((msg, idx) => {
        if (formatted.isPersisted(msg.id)) return null;

        const parentId = idx > 0 ? messages[idx - 1]!.id : null;

        return formatted
          .append(tid, { parentId, message: msg })
          .catch((err) => {
            if (mountedRef.current) {
              handleSyncError(err);
            }
            return null;
          });
      });

      const pending = appendTasks.filter(
        (task): task is Promise<void | null> => task !== null,
      );
      if (pending.length > 0) {
        await Promise.all(pending);
      }

      if (
        autoGenerateTitle &&
        newlyCreatedThreadRef.current === tid &&
        !titleGeneratedRef.current.has(tid) &&
        messages.some((msg) => msg.role === "assistant")
      ) {
        titleGeneratedRef.current.add(tid);
        newlyCreatedThreadRef.current = null;
        void threadsRef.current.generateTitle(tid);
      }
    };

    void persist();
  }, [
    autoGenerateTitle,
    chat.messages,
    getFormatted,
    handleSyncError,
    isRunning,
  ]);

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
        handleSyncError(err);
      }
    },
    [getFormatted, handleSyncError],
  );

  useEffect(() => {
    const activeThreadId = threadIdRef.current ?? createdThreadRef.current;
    if (!activeThreadId) return;
    // Don't overwrite cached messages with empty array (race condition from chatId switch)
    if (
      chat.messages.length === 0 &&
      messagesByThreadRef.current.has(activeThreadId)
    ) {
      return;
    }
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
      // Reset creation mutex when switching away from new thread
      creatingThreadRef.current = null;
    }

    if (!threadId) {
      setMessagesRef.current([]);
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

    // Skip loading for threads we just created (messages already in sync from send)
    // Cache restoration already handled above if useChat reset on id change
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
    threads,
  };
}
