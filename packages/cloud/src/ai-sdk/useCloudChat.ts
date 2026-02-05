"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
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
  const chatInitRef = useRef(chatOptions);
  chatInitRef.current = chatOptions;

  const onFinishRef = useRef(chatOptions?.onFinish);
  onFinishRef.current = chatOptions?.onFinish;
  const onDataRef = useRef(chatOptions?.onData);
  onDataRef.current = chatOptions?.onData;
  const onToolCallRef = useRef(chatOptions?.onToolCall);
  onToolCallRef.current = chatOptions?.onToolCall;
  const onErrorRef = useRef(chatOptions?.onError);
  onErrorRef.current = chatOptions?.onError;
  const sendAutomaticallyWhenRef = useRef(chatOptions?.sendAutomaticallyWhen);
  sendAutomaticallyWhenRef.current = chatOptions?.sendAutomaticallyWhen;

  const onSyncErrorRef = useRef(onSyncError);
  onSyncErrorRef.current = onSyncError;

  const autoGenerateTitleRef = useRef(autoGenerateTitle);
  autoGenerateTitleRef.current = autoGenerateTitle;

  const handleSyncError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    onSyncErrorRef.current?.(error);
  }, []);

  // For auto-title generation: track newly created threads
  const newlyCreatedThreadIdsRef = useRef(new Set<string>());
  const titleGeneratedRef = useRef(new Set<string>());

  type ChatMeta = {
    threadId: string | null;
    creatingThread: Promise<string> | null;
    loading: Promise<void> | null;
    loaded: boolean;
  };

  const chatByKeyRef = useRef(new Map<string, Chat<UIMessage>>());
  const chatMetaByKeyRef = useRef(new Map<string, ChatMeta>());
  const chatKeyByThreadIdRef = useRef(new Map<string, string>());

  const newChatKeyRef = useRef<string | null>(null);
  if (!newChatKeyRef.current) {
    newChatKeyRef.current = createSessionId();
  }

  const lastThreadIdRef = useRef<string | null>(threadId);
  useEffect(() => {
    if (threadId === null && lastThreadIdRef.current !== null) {
      newChatKeyRef.current = createSessionId();
    }
    lastThreadIdRef.current = threadId;
  }, [threadId]);

  // Track mounted state
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const defaultTransportRef = useRef<ChatTransport<UIMessage> | null>(null);
  if (!defaultTransportRef.current) {
    defaultTransportRef.current = new DefaultChatTransport({});
  }
  const baseTransportRef = useRef<ChatTransport<UIMessage>>(
    userTransport ?? defaultTransportRef.current,
  );
  baseTransportRef.current = userTransport ?? defaultTransportRef.current;

  const ensureChatMeta = useCallback(
    (chatKey: string, threadIdHint?: string | null) => {
      const existing = chatMetaByKeyRef.current.get(chatKey);
      if (existing) {
        if (threadIdHint && !existing.threadId) {
          existing.threadId = threadIdHint;
        }
        return existing;
      }

      const created: ChatMeta = {
        threadId: threadIdHint ?? null,
        creatingThread: null,
        loading: null,
        loaded: false,
      };
      chatMetaByKeyRef.current.set(chatKey, created);
      return created;
    },
    [],
  );

  const persistChatMessages = useCallback(
    async (chatKey: string) => {
      const meta = chatMetaByKeyRef.current.get(chatKey);
      const tid = meta?.threadId;
      if (!tid) return;

      const chatInstance = chatByKeyRef.current.get(chatKey);
      if (!chatInstance) return;

      const formatted = getFormatted(tid);
      const messages = chatInstance.messages;

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
        autoGenerateTitleRef.current &&
        newlyCreatedThreadIdsRef.current.has(tid) &&
        !titleGeneratedRef.current.has(tid) &&
        messages.some((msg) => msg.role === "assistant")
      ) {
        titleGeneratedRef.current.add(tid);
        newlyCreatedThreadIdsRef.current.delete(tid);
        void threadsRef.current.generateTitle(tid);
      }
    },
    [getFormatted, handleSyncError],
  );

  const createTransport = useCallback(
    (chatKey: string): ChatTransport<UIMessage> => ({
      sendMessages: async (opts) => {
        const meta = ensureChatMeta(chatKey);
        let currentThreadId = meta.threadId;

        if (!currentThreadId) {
          if (!meta.creatingThread) {
            meta.creatingThread = (async () => {
              try {
                const res = await threadsRef.current.cloud.threads.create({
                  last_message_at: new Date(),
                });
                meta.threadId = res.thread_id;
                meta.loaded = true;
                meta.loading = null;
                newlyCreatedThreadIdsRef.current.add(res.thread_id);
                chatKeyByThreadIdRef.current.set(res.thread_id, chatKey);
                threadsRef.current.selectThread(res.thread_id);
                threadsRef.current.refresh();
                return res.thread_id;
              } catch (err) {
                meta.creatingThread = null;
                throw err;
              } finally {
                meta.creatingThread = null;
              }
            })();
          }
          currentThreadId = await meta.creatingThread;
        }

        return await baseTransportRef.current.sendMessages({
          ...opts,
          body: {
            ...opts.body,
            id: currentThreadId ?? opts.chatId,
          },
        });
      },
      reconnectToStream: (opts) =>
        baseTransportRef.current.reconnectToStream(opts),
    }),
    [ensureChatMeta],
  );

  const createChat = useCallback(
    (chatKey: string) => {
      const {
        onFinish: _onFinish,
        onData: _onData,
        onError: _onError,
        onToolCall: _onToolCall,
        sendAutomaticallyWhen: _sendAutomaticallyWhen,
        id: _id,
        ...chatInit
      } = chatInitRef.current;

      return new Chat<UIMessage>({
        ...chatInit,
        id: chatKey,
        transport: createTransport(chatKey),
        onFinish: async (event) => {
          try {
            await onFinishRef.current?.(event);
          } finally {
            await persistChatMessages(chatKey);
          }
        },
        onError: (error) => {
          onErrorRef.current?.(error);
        },
        onData: (data) => {
          onDataRef.current?.(data);
        },
        onToolCall: (toolCall) => {
          onToolCallRef.current?.(toolCall);
        },
        sendAutomaticallyWhen: (arg) =>
          sendAutomaticallyWhenRef.current?.(arg) ?? false,
      });
    },
    [createTransport, persistChatMessages],
  );

  const getOrCreateChat = useCallback(
    (chatKey: string, threadIdHint?: string | null) => {
      const existing = chatByKeyRef.current.get(chatKey);
      if (existing) {
        if (threadIdHint) {
          ensureChatMeta(chatKey, threadIdHint);
        }
        return existing;
      }

      const chatInstance = createChat(chatKey);
      chatByKeyRef.current.set(chatKey, chatInstance);
      ensureChatMeta(chatKey, threadIdHint);
      return chatInstance;
    },
    [createChat, ensureChatMeta],
  );

  const activeChatKey = threadId
    ? (chatKeyByThreadIdRef.current.get(threadId) ?? threadId)
    : (newChatKeyRef.current ?? (newChatKeyRef.current = createSessionId()));

  const activeChat = getOrCreateChat(activeChatKey, threadId);

  const chat = useChat({ chat: activeChat });

  const loadThreadMessages = useCallback(
    async (
      id: string,
      chatKey: string,
      cancelledRef: { cancelled: boolean },
    ) => {
      const formatted = getFormatted(id);

      try {
        const { messages } = await formatted.load(id);
        if (cancelledRef.cancelled) return;

        const loaded = messages.map((item) => item.message);
        const chatInstance = getOrCreateChat(chatKey, id);
        chatInstance.messages = loaded;

        const meta = ensureChatMeta(chatKey, id);
        meta.loaded = true;
        meta.loading = null;
      } catch (err) {
        const meta = ensureChatMeta(chatKey, id);
        meta.loading = null;
        if (cancelledRef.cancelled) return;
        handleSyncError(err);
      }
    },
    [ensureChatMeta, getFormatted, getOrCreateChat, handleSyncError],
  );

  useEffect(() => {
    if (!threadId) return;

    const chatKey = chatKeyByThreadIdRef.current.get(threadId) ?? threadId;
    const chatInstance = getOrCreateChat(chatKey, threadId);
    const meta = ensureChatMeta(chatKey, threadId);

    if (meta.loaded || meta.loading || chatInstance.messages.length > 0) {
      meta.loaded = true;
      return;
    }

    const cancelledRef = { cancelled: false };
    meta.loading = loadThreadMessages(threadId, chatKey, cancelledRef);

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [threadId, ensureChatMeta, getOrCreateChat, loadThreadMessages]);

  return {
    ...chat,
    threads,
  };
}
