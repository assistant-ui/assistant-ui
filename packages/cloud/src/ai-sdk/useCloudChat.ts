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

  const [persistence] = useState(() => new CloudMessagePersistence(cloud));
  const [formatted] = useState(() =>
    createFormattedPersistence(persistence, aiSdkFormatAdapter),
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
    if (mountedRef.current) setThreadId(tid);
    onThreadCreatedRef.current?.(tid);

    return tid;
  }, [cloud]);

  const chat = useChat({
    ...chatOptions,
    transport,
    onFinish: async (event) => {
      // Persist assistant message when response completes.
      try {
        const tid = threadIdRef.current;
        if (!tid) return; // Should never happen - thread created on sendMessage

        const assistantMsg = event.message;
        if (formatted.isPersisted(assistantMsg.id)) return;

        // Find parent (the user message before this assistant message)
        const msgIndex = event.messages.findIndex(
          (m) => m.id === assistantMsg.id,
        );
        const parentId = msgIndex > 0 ? event.messages[msgIndex - 1]!.id : null;

        await formatted.append(tid, { parentId, message: assistantMsg });
      } catch (err) {
        if (mountedRef.current) {
          setSyncError(err instanceof Error ? err : new Error(String(err)));
        }
      }

      // Auto-generate title for new threads after first assistant response.
      if (isNewThreadRef.current) {
        isNewThreadRef.current = false;
        generateTitleInternal(event.messages).catch(() => {
          // Title generation is best-effort; don't fail the persistence flow
        });
      }

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

  // Persist user messages immediately; assistant message persists in onFinish.
  // Promise-based mapping ensures correct parent/child ordering.
  useEffect(() => {
    const tid = threadIdRef.current;
    if (!tid) return;

    const messages = chat.messages;
    for (const msg of messages) {
      if (msg.role !== "user") continue;
      if (formatted.isPersisted(msg.id)) continue;

      const idx = messages.indexOf(msg);
      const parentId = idx > 0 ? messages[idx - 1]!.id : null;

      formatted.append(tid, { parentId, message: msg }).catch((err) => {
        if (mountedRef.current) {
          setSyncError(err instanceof Error ? err : new Error(String(err)));
        }
      });
    }
  }, [chat.messages, formatted]);

  // Load messages when threadId changes (explicit action, not observation)
  useEffect(() => {
    threadIdRef.current = threadId;

    if (!threadId) {
      setMessagesRef.current([]);
      persistence.reset();
      setSyncError(null);
      return;
    }

    // Skip loading for newly created threads — the optimistic messages
    // from sendMessage are already in chat state. Loading from the cloud
    // would return an empty array and wipe them out.
    if (isNewThreadRef.current) {
      return;
    }

    let cancelled = false;

    formatted
      .load(threadId)
      .then(({ messages }) => {
        if (cancelled) return;
        setMessagesRef.current(messages.map((item) => item.message));
      })
      .catch((err) => {
        if (cancelled) return;
        setSyncError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      cancelled = true;
    };
  }, [threadId, persistence, formatted]);

  const selectThread = useCallback(
    (id: string | null) => {
      setThreadId(id);
      setSyncError(null);
      persistence.reset();
      isNewThreadRef.current = false;
    },
    [persistence],
  );

  /**
   * Internal title generation that accepts messages directly.
   * Used by both the auto-trigger in onFinish and the public generateTitle().
   */
  async function generateTitleInternal(
    messages: UIMessage[],
  ): Promise<string | null> {
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
  }

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
  }, [cloud]);

  return {
    ...chat,
    sendMessage, // Override with our wrapped version
    threadId,
    selectThread,
    syncError,
    generateTitle,
  };
}
