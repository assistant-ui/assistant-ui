"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatInit } from "ai";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { AssistantCloud } from "../AssistantCloud";
import { CloudMessagePersistence } from "../CloudMessagePersistence";
import {
  createFormattedPersistence,
  type MessageFormatAdapter,
} from "../FormattedCloudPersistence";
import { encode, MESSAGE_FORMAT } from "./format";
import { useThreads, type UseThreadsResult } from "./useThreads";

// Module-level singleton for auto-cloud to ensure all components share the same instance
const autoCloudBaseUrl =
  typeof process !== "undefined"
    ? process?.env?.["NEXT_PUBLIC_ASSISTANT_BASE_URL"]
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

export type UseCloudChatOptions = Omit<ChatInit<UIMessage>, "transport"> & {
  /** External thread management. If provided, internal threads are disabled. */
  threads?: UseThreadsResult;
  /** Cloud instance. Ignored if threads provided. Falls back to NEXT_PUBLIC_ASSISTANT_BASE_URL env var. */
  cloud?: AssistantCloud;
  /** Include archived threads when managing internally. Default: false */
  includeArchived?: boolean;
  /** Auto-generate title after first response on new threads. Default: true */
  autoGenerateTitle?: boolean;
};

export type UseCloudChatResult = UseChatHelpers<UIMessage> & {
  /** Sync error state */
  syncError: Error | null;
  /** Thread management (internal or passed-through) */
  threads: UseThreadsResult;
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
 * // Simplest usage - just set NEXT_PUBLIC_ASSISTANT_BASE_URL env var
 * const { messages, sendMessage, threads } = useCloudChat({ api: "/api/chat" });
 *
 * // With explicit cloud instance
 * const { messages, sendMessage, threads } = useCloudChat({ cloud: myCloud, api: "/api/chat" });
 *
 * // With external thread control (backwards compatible)
 * const myThreads = useThreads({ cloud: myCloud });
 * const { messages, sendMessage } = useCloudChat({ threads: myThreads, api: "/api/chat" });
 * ```
 */
export function useCloudChat(
  options: UseCloudChatOptions = {},
): UseCloudChatResult {
  const {
    threads: externalThreads,
    cloud: cloudOption,
    includeArchived,
    autoGenerateTitle = true,
    ...chatOptions
  } = options;

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
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Refs for latest values (avoid stale closures)
  const threadIdRef = useRef<string | null>(threadId);
  threadIdRef.current = threadId;
  const createdThreadRef = useRef<string | null>(null);
  const loadedThreadsRef = useRef(new Set<string>());
  const messagesByThreadRef = useRef(new Map<string, UIMessage[]>());
  const onFinishRef = useRef(chatOptions?.onFinish);
  onFinishRef.current = chatOptions?.onFinish;

  // For auto-title generation: track newly created threads
  const newlyCreatedThreadRef = useRef<string | null>(null);
  const titleGeneratedRef = useRef(new Set<string>());

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
        prepareSendMessagesRequest: async (opts) => {
          // Ensure thread exists before sending
          if (!threadIdRef.current && !createdThreadRef.current) {
            const res = await threadsRef.current.cloud.threads.create({
              last_message_at: new Date(),
            });
            createdThreadRef.current = res.thread_id;
            threadIdRef.current = res.thread_id;
            loadedThreadsRef.current.add(res.thread_id);
            // Track for auto-title generation
            newlyCreatedThreadRef.current = res.thread_id;
            // Auto-select the new thread and refresh the list
            threadsRef.current.selectThread(res.thread_id);
            threadsRef.current.refresh();
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
    [],
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
              setSyncError(err instanceof Error ? err : new Error(String(err)));
            }
            return null;
          });
      });

      const pending = appendTasks.filter(
        (task): task is Promise<string | null> => task !== null,
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
  }, [autoGenerateTitle, chat.messages, getFormatted, isRunning]);

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
    threads,
  };
}
