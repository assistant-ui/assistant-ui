"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatTransport } from "ai";
import type { UseCloudChatOptions, UseCloudChatResult } from "../types";
import { useThreads } from "../threads/useThreads";
import { AssistantCloud } from "assistant-cloud";
import { ChatMultiplexer } from "./internal/ChatMultiplexer";
import { MessagePersistence } from "./internal/MessagePersistence";

// ============================================================================
// Module Singletons
// ============================================================================

// Module-level singleton cloud instance for zero-config mode (from NEXT_PUBLIC_ASSISTANT_BASE_URL)
const autoCloudBaseUrl =
  typeof process !== "undefined"
    ? process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]
    : undefined;
const autoCloud = autoCloudBaseUrl
  ? new AssistantCloud({ baseUrl: autoCloudBaseUrl, anonymous: true })
  : undefined;

// Generate unique chat session IDs
function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `aui_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// ============================================================================
// Main Hook
// ============================================================================

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

  // ============================================================================
  // 1. Resolve Configuration
  // ============================================================================

  const externalThreads = threadsOption;

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
    enabled: !externalThreads, // Skip fetch if user manages threads
  });

  // Use external if provided, otherwise internal
  const threads = externalThreads ?? internalThreads;
  const { cloud, threadId } = threads;

  // ============================================================================
  // 2. Refs for Stable References
  // ============================================================================

  const threadsRef = useRef(threads);
  threadsRef.current = threads;

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

  // Track mounted state
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // For auto-title generation: track newly created threads
  const newlyCreatedThreadIdsRef = useRef(new Set<string>());
  const titleGeneratedRef = useRef(new Set<string>());

  // ============================================================================
  // 3. Initialize Core Services
  // ============================================================================

  const handleSyncError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    onSyncErrorRef.current?.(error);
  }, []);

  const persistenceRef = useRef<MessagePersistence | null>(null);
  if (!persistenceRef.current) {
    persistenceRef.current = new MessagePersistence(cloud, handleSyncError);
  }
  const persistence = persistenceRef.current;

  const defaultTransportRef = useRef<ChatTransport<UIMessage> | null>(null);
  if (!defaultTransportRef.current) {
    defaultTransportRef.current = new DefaultChatTransport({});
  }
  const baseTransportRef = useRef<ChatTransport<UIMessage>>(
    userTransport ?? defaultTransportRef.current,
  );
  baseTransportRef.current = userTransport ?? defaultTransportRef.current;

  // ============================================================================
  // 4. Chat Factory and Multiplexer
  // ============================================================================

  const persistChatMessages = useCallback(
    async (chatKey: string, multiplexer: ChatMultiplexer) => {
      const meta = multiplexer.getMeta(chatKey);
      const tid = meta?.threadId;
      if (!tid) return;

      const chatInstance = multiplexer.get(chatKey);
      if (!chatInstance) return;

      const messages = chatInstance.messages;
      await persistence.persistMessages(tid, messages, mountedRef);

      // Auto-generate title after first assistant response
      if (
        newlyCreatedThreadIdsRef.current.has(tid) &&
        !titleGeneratedRef.current.has(tid) &&
        messages.some((msg) => msg.role === "assistant")
      ) {
        titleGeneratedRef.current.add(tid);
        newlyCreatedThreadIdsRef.current.delete(tid);
        void threadsRef.current.generateTitle(tid);
      }
    },
    [persistence],
  );

  const createTransport = useCallback(
    (
      chatKey: string,
      multiplexer: ChatMultiplexer,
    ): ChatTransport<UIMessage> => ({
      sendMessages: async (opts) => {
        const meta = multiplexer.ensureMeta(chatKey);
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
                multiplexer.setThreadId(chatKey, res.thread_id);
                threadsRef.current.selectThread(res.thread_id);
                threadsRef.current.refresh();
                return res.thread_id;
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
    [],
  );

  const createChat = useCallback(
    (chatKey: string, multiplexer: ChatMultiplexer) => {
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
        transport: createTransport(chatKey, multiplexer),
        onFinish: async (event) => {
          try {
            await onFinishRef.current?.(event);
          } finally {
            await persistChatMessages(chatKey, multiplexer);
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

  const multiplexerRef = useRef<ChatMultiplexer | null>(null);
  if (!multiplexerRef.current) {
    // Circular reference: multiplexer needs createChat which needs multiplexer
    // We solve this by passing multiplexer to createChat at call time
    multiplexerRef.current = new ChatMultiplexer((chatKey) =>
      createChat(chatKey, multiplexerRef.current!),
    );
  }
  const multiplexer = multiplexerRef.current;

  // ============================================================================
  // 5. Determine Active Chat
  // ============================================================================

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

  const activeChatKey = threadId
    ? (multiplexer.getChatKeyForThread(threadId) ?? threadId)
    : (newChatKeyRef.current ?? (newChatKeyRef.current = createSessionId()));

  const activeChat = multiplexer.getOrCreate(activeChatKey, threadId);

  // ============================================================================
  // 6. Load Messages Effect
  // ============================================================================

  const loadThreadMessages = useCallback(
    async (
      id: string,
      chatKey: string,
      cancelledRef: { cancelled: boolean },
    ) => {
      try {
        const messages = await persistence.loadMessages(id);
        if (cancelledRef.cancelled) return;

        const chatInstance = multiplexer.getOrCreate(chatKey, id);
        chatInstance.messages = messages;

        const meta = multiplexer.ensureMeta(chatKey, id);
        meta.loaded = true;
        meta.loading = null;
      } catch (err) {
        const meta = multiplexer.ensureMeta(chatKey, id);
        meta.loading = null;
        if (cancelledRef.cancelled) return;
        handleSyncError(err);
      }
    },
    [persistence, multiplexer, handleSyncError],
  );

  useEffect(() => {
    if (!threadId) return;

    const chatKey = multiplexer.getChatKeyForThread(threadId) ?? threadId;
    const chatInstance = multiplexer.getOrCreate(chatKey, threadId);
    const meta = multiplexer.ensureMeta(chatKey, threadId);

    if (meta.loaded || meta.loading || chatInstance.messages.length > 0) {
      meta.loaded = true;
      return;
    }

    const cancelledRef = { cancelled: false };
    meta.loading = loadThreadMessages(threadId, chatKey, cancelledRef);

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [threadId, multiplexer, loadThreadMessages]);

  // ============================================================================
  // 7. Return Composed Result
  // ============================================================================

  const chat = useChat({ chat: activeChat });

  return {
    ...chat,
    threads,
  };
}
