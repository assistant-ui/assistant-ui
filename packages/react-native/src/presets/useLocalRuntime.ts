import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  generateId,
  type ThreadMessage,
  type Unsubscribe,
} from "@assistant-ui/core";
import { ThreadListRuntimeCore } from "../runtime/ThreadListRuntimeCore";
import { ThreadRuntimeCore } from "../runtime/ThreadRuntimeCore";
import type {
  ThreadListRuntime,
  ThreadRuntime,
  ThreadRuntimeState,
  ComposerRuntime,
  ComposerRuntimeState,
} from "../runtime/types";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import type { ChatModelAdapter } from "../adapters/ChatModelAdapter";
import { createSimpleTitleAdapter } from "../adapters/TitleGenerationAdapter";
import { createInMemoryStorageAdapter } from "../adapters/StorageAdapter";

export type LocalRuntimeOptions = {
  /**
   * Chat model adapter for AI responses
   */
  chatModel: ChatModelAdapter;

  /**
   * Storage adapter for persistence
   * If not provided, uses in-memory storage (data lost on reload)
   */
  storage?: StorageAdapter;

  /**
   * Custom title generation function
   * If not provided, extracts title from first user message
   */
  generateTitle?: (messages: readonly ThreadMessage[]) => Promise<string>;

  /**
   * Initial thread ID to load
   */
  initialThreadId?: string;
};

export type LocalRuntime = {
  threadList: ThreadListRuntime;
  thread: ThreadRuntime;
  composer: ComposerRuntime;
  currentThreadId: string | undefined;
  isInitialized: boolean;
  switchToThread: (threadId: string) => void;
  switchToNewThread: () => string;
};

export function useLocalRuntime(options: LocalRuntimeOptions): LocalRuntime {
  const { chatModel, storage, generateTitle, initialThreadId } = options;

  // Create adapters
  const storageAdapter = useMemo(() => {
    return storage ?? createInMemoryStorageAdapter();
  }, [storage]);

  const titleGenerator = useMemo(() => {
    if (generateTitle) {
      return generateTitle;
    }
    const simpleAdapter = createSimpleTitleAdapter();
    return simpleAdapter.generateTitle;
  }, [generateTitle]);

  // State
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(
    initialThreadId,
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [composerState, setComposerState] = useState<ComposerRuntimeState>(
    createInitialComposerState(),
  );

  // Refs
  const threadListCoreRef = useRef<ThreadListRuntimeCore | null>(null);
  const threadCoreRef = useRef<ThreadRuntimeCore | null>(null);
  const composerSubscribersRef = useRef<Set<() => void>>(new Set());
  const titleGenerationInProgress = useRef<Set<string>>(new Set());

  // Initialize ThreadListRuntime
  useEffect(() => {
    const threadListCore = new ThreadListRuntimeCore({
      loadThreads: storageAdapter.loadThreads,
      saveThreads: storageAdapter.saveThreads,
      onSwitchToThread: setCurrentThreadId,
      onSwitchToNewThread: setCurrentThreadId,
      generateTitle: async (_threadId, messages) => {
        const title = await titleGenerator(messages as ThreadMessage[]);
        return title;
      },
    });

    threadListCoreRef.current = threadListCore;
    threadListCore.initialize().then(() => {
      setIsInitialized(true);
    });
  }, [storageAdapter, titleGenerator]);

  // Create/update ThreadRuntime when threadId changes
  useEffect(() => {
    if (!currentThreadId || !threadListCoreRef.current) return;

    const threadCore = new ThreadRuntimeCore({
      threadId: currentThreadId,
      chatModel,
      loadMessages: storageAdapter.loadMessages,
      saveMessages: async (threadId, messages) => {
        await storageAdapter.saveMessages(threadId, messages);

        // Check if thread exists in list
        const existingThread = threadListCoreRef.current?.getThread(threadId);
        const hasUserMessage = messages.some((m) => m.role === "user");
        const hasCompleteAssistantMessage = messages.some(
          (m) =>
            m.role === "assistant" &&
            m.status?.type === "complete" &&
            m.content.some(
              (c) => c.type === "text" && "text" in c && c.text.length > 0,
            ),
        );

        if (!existingThread && hasUserMessage) {
          // Add thread to list
          const now = new Date();
          await threadListCoreRef.current?.addThread({
            id: threadId,
            title: "New Chat",
            createdAt: now,
            lastMessageAt: now,
            status: "active",
          });

          // Generate title after first complete conversation
          if (
            hasCompleteAssistantMessage &&
            !titleGenerationInProgress.current.has(threadId)
          ) {
            titleGenerationInProgress.current.add(threadId);
            threadListCoreRef.current
              ?.generateTitle(threadId, messages)
              .finally(() => {
                titleGenerationInProgress.current.delete(threadId);
              });
          }
        } else if (existingThread) {
          // Update existing thread
          const shouldGenerateTitle =
            existingThread.title === "New Chat" &&
            hasCompleteAssistantMessage &&
            !titleGenerationInProgress.current.has(threadId);

          if (shouldGenerateTitle) {
            titleGenerationInProgress.current.add(threadId);
            threadListCoreRef.current
              ?.generateTitle(threadId, messages)
              .finally(() => {
                titleGenerationInProgress.current.delete(threadId);
              });
          } else {
            await threadListCoreRef.current?.updateThread(threadId, {
              lastMessageAt: new Date(),
            });
          }
        }
      },
    });

    threadCoreRef.current = threadCore;
    threadCore.initialize();

    return () => {
      threadCoreRef.current = null;
    };
  }, [currentThreadId, chatModel, storageAdapter]);

  // Composer runtime
  const notifyComposerSubscribers = useCallback(() => {
    composerSubscribersRef.current.forEach((cb) => cb());
  }, []);

  const composerRuntime: ComposerRuntime = useMemo(() => {
    return {
      getState: () => composerState,
      subscribe: (callback: () => void): Unsubscribe => {
        composerSubscribersRef.current.add(callback);
        return () => {
          composerSubscribersRef.current.delete(callback);
        };
      },
      setText: (text: string) => {
        const isRunning = threadCoreRef.current?.getState().isRunning ?? false;
        setComposerState((prev) => ({
          ...prev,
          text,
          isEmpty: text.length === 0,
          canSend: text.trim().length > 0 && !isRunning,
        }));
        notifyComposerSubscribers();
      },
      send: () => {
        const text = composerState.text.trim();
        const isRunning = threadCoreRef.current?.getState().isRunning ?? false;
        if (!text || isRunning) return;

        threadCoreRef.current?.append({
          role: "user",
          content: [{ type: "text", text }],
        });

        setComposerState((prev) => ({
          ...prev,
          text: "",
          isEmpty: true,
          canSend: false,
        }));
        notifyComposerSubscribers();
      },
      cancel: () => {
        threadCoreRef.current?.cancelRun();
      },
      reset: () => {
        setComposerState(createInitialComposerState());
        notifyComposerSubscribers();
      },
      addAttachment: async () => {},
      removeAttachment: async () => {},
    };
  }, [composerState, notifyComposerSubscribers]);

  // Thread runtime wrapper
  const threadRuntime: ThreadRuntime = useMemo(() => {
    const defaultState: ThreadRuntimeState = {
      threadId: currentThreadId ?? "",
      isRunning: false,
      isDisabled: false,
      isEmpty: true,
      isLoading: true,
      messages: [],
      capabilities: {
        switchToBranch: false,
        switchBranchDuringRun: false,
        edit: false,
        reload: false,
        cancel: true,
        unstable_copy: true,
        speech: false,
        attachments: false,
        feedback: false,
      },
    };

    return {
      getState: () => threadCoreRef.current?.getState() ?? defaultState,
      subscribe: (callback) => {
        return threadCoreRef.current?.subscribe(callback) ?? (() => {});
      },
      append: (message) => threadCoreRef.current?.append(message),
      startRun: (parentId) => threadCoreRef.current?.startRun(parentId),
      cancelRun: () => threadCoreRef.current?.cancelRun(),
    };
  }, [currentThreadId]);

  // ThreadList runtime wrapper
  const threadListRuntime: ThreadListRuntime = useMemo(() => {
    const defaultState = {
      threads: [],
      isLoading: true,
      newThreadId: undefined,
    };

    return {
      getState: () => threadListCoreRef.current?.getState() ?? defaultState,
      subscribe: (callback) => {
        return threadListCoreRef.current?.subscribe(callback) ?? (() => {});
      },
      createThread: () => {
        return threadListCoreRef.current?.createThread() ?? generateId();
      },
      deleteThread: async (threadId) => {
        await threadListCoreRef.current?.deleteThread(threadId);
        await storageAdapter.deleteThread(threadId);
      },
      switchToThread: (threadId) => {
        threadListCoreRef.current?.switchToThread(threadId);
      },
      switchToNewThread: () => {
        return threadListCoreRef.current?.switchToNewThread() ?? generateId();
      },
    };
  }, [storageAdapter]);

  // Switch functions
  const switchToThread = useCallback((threadId: string) => {
    setCurrentThreadId(threadId);
  }, []);

  const switchToNewThread = useCallback(() => {
    const threadId = generateId();
    setCurrentThreadId(threadId);
    return threadId;
  }, []);

  return {
    threadList: threadListRuntime,
    thread: threadRuntime,
    composer: composerRuntime,
    currentThreadId,
    isInitialized,
    switchToThread,
    switchToNewThread,
  };
}

function createInitialComposerState(): ComposerRuntimeState {
  return {
    text: "",
    attachments: [],
    canSend: false,
    canCancel: false,
    isEditing: false,
    isEmpty: true,
    type: "thread",
  };
}
