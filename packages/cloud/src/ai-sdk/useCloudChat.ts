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
  /** API endpoint for chat. Defaults to "/api/chat" */
  api?: string;
  /** Called when a new thread is created */
  onThreadCreated?: (threadId: string) => void;
  /** Called when a title is automatically generated for a new thread */
  onTitleGenerated?: (threadId: string, title: string) => void;
};

export type UseCloudChatResult = Omit<
  UseChatHelpers<UIMessage>,
  "sendMessage"
> & {
  /** Current thread ID (null for new conversation) */
  threadId: string | null;
  /** Switch to a different thread or start new (null) */
  selectThread: (id: string | null) => void;
  /** Sync error state */
  syncError: Error | null;
  /** Wrapped sendMessage that persists to cloud */
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  /**
   * Generate a title for the current thread using AI.
   * Uses the cloud's built-in title generation assistant.
   * @returns The generated title, or null if generation failed
   */
  generateTitle: () => Promise<string | null>;
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
 * const threads = useThreads(cloud);
 * const chat = useCloudChat(cloud, {
 *   api: "/api/chat",
 *   onThreadCreated: () => threads.refresh(),
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
export function useCloudChat(
  cloud: AssistantCloud,
  options?: UseCloudChatOptions,
): UseCloudChatResult {
  const { api, onThreadCreated, onTitleGenerated, ...chatOptions } =
    options ?? {};

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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: api ?? "/api/chat" }),
    [api],
  );

  // Refs for latest values (avoid stale closures)
  const threadIdRef = useRef<string | null>(null);
  const isNewThreadRef = useRef(false);
  const loadedThreadsRef = useRef(new Set<string>());
  const onThreadCreatedRef = useRef(onThreadCreated);
  onThreadCreatedRef.current = onThreadCreated;
  const onTitleGeneratedRef = useRef(onTitleGenerated);
  onTitleGeneratedRef.current = onTitleGenerated;
  const onFinishRef = useRef(chatOptions?.onFinish);
  onFinishRef.current = chatOptions?.onFinish;

  // Track mounted state
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Ensure a thread exists, creating one if needed.
   */
  const ensureThread = useCallback(async (): Promise<string> => {
    if (threadIdRef.current) return threadIdRef.current;

    const res = await cloud.threads.create({
      last_message_at: new Date(),
    });

    const tid = res.thread_id;
    threadIdRef.current = tid;
    isNewThreadRef.current = true;
    loadedThreadsRef.current.add(tid);
    if (mountedRef.current) setThreadId(tid);
    onThreadCreatedRef.current?.(tid);

    return tid;
  }, [cloud]);

  const chat = useChat({
    ...chatOptions,
    transport,
    onFinish: (event) => {
      onFinishRef.current?.(event);
    },
  });

  // Store ref for chat state access in callbacks
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const setMessagesRef = useRef(chat.setMessages);
  setMessagesRef.current = chat.setMessages;

  /**
   * Wrapped sendMessage that ensures thread exists and persists messages.
   */
  const sendMessage: UseChatHelpers<UIMessage>["sendMessage"] = useCallback(
    async (message, requestOptions) => {
      try {
        await ensureThread();
        return await chat.sendMessage(message, requestOptions);
      } catch (err) {
        if (mountedRef.current) {
          setSyncError(err instanceof Error ? err : new Error(String(err)));
        }
        throw err;
      }
    },
    [chat.sendMessage, ensureThread],
  );

  const isRunning = chat.status === "submitted" || chat.status === "streaming";

  // Persist messages when not running, matching assistant-ui history semantics.
  useEffect(() => {
    const tid = threadIdRef.current;
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

        setMessagesRef.current(messages.map((item) => item.message));
      } catch (err) {
        if (cancelledRef.cancelled) return;
        setSyncError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [getFormatted],
  );

  // Load messages when threadId changes (explicit action, not observation).
  // Only fires on thread switch, not on isRunning transitions — matching
  // useExternalHistory's load-once-per-thread semantics.
  useEffect(() => {
    threadIdRef.current = threadId;

    if (!threadId) {
      setMessagesRef.current([]);
      setSyncError(null);
      return;
    }

    // Skip threads we've already loaded or created in this session.
    if (loadedThreadsRef.current.has(threadId)) {
      return;
    }

    // Mark loaded before the async call to prevent re-entry.
    loadedThreadsRef.current.add(threadId);

    const cancelledRef = { cancelled: false };
    loadThreadMessages(threadId, cancelledRef);

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [threadId, loadThreadMessages]);

  const selectThread = useCallback((id: string | null) => {
    setThreadId(id);
    setSyncError(null);
    isNewThreadRef.current = false;
  }, []);

  /**
   * Internal title generation that accepts messages directly.
   * Used by both the auto-trigger in onFinish and the public generateTitle().
   */
  const generateTitleInternal = useCallback(
    async (messages: UIMessage[]): Promise<string | null> => {
      const tid = threadIdRef.current;
      if (!tid || messages.length === 0) return null;

      // Convert to title generator format (text parts only).
      const convertedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.parts
          .filter((part) => part.type === "text")
          .map((part) => ({
            type: "text" as const,
            text: (part as { type: "text"; text: string }).text,
          })),
      }));

      const stream = await cloud.runs.stream({
        thread_id: tid,
        assistant_id: "system/thread_title",
        messages: convertedMessages,
      });

      let title = "";
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          if (chunk.type === "text-delta") {
            title += chunk.textDelta;
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (title) {
        await cloud.threads.update(tid, { title });
        onTitleGeneratedRef.current?.(tid, title);
      }

      return title || null;
    },
    [cloud],
  );

  /**
   * Generate a title for the current thread using AI.
   * Called automatically for new threads after the first response.
   * Can also be called manually for existing threads.
   */
  const generateTitle = useCallback(async (): Promise<string | null> => {
    try {
      const result = await generateTitleInternal(chatRef.current.messages);
      setSyncError(null);
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setSyncError(err instanceof Error ? err : new Error(String(err)));
      }
      return null;
    }
  }, [generateTitleInternal]);

  // Auto-generate title for new threads after the first run completes.
  useEffect(() => {
    if (isRunning) return;

    if (isNewThreadRef.current) {
      isNewThreadRef.current = false;
      generateTitleInternal(chatRef.current.messages).catch(() => {
        // Title generation is best-effort; don't fail the persistence flow
      });
    }
  }, [generateTitleInternal, isRunning]);

  return {
    ...chat,
    sendMessage, // Override with our wrapped version
    threadId,
    selectThread,
    syncError,
    generateTitle,
  };
}
