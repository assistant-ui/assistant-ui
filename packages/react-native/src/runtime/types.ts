import type {
  Unsubscribe,
  ThreadMessage,
  ThreadListItemState,
  RuntimeCapabilities,
  AppendMessage as CoreAppendMessage,
  Subscribable as CoreSubscribable,
} from "@assistant-ui/core";

// Re-export from core for internal use
export type { ThreadListItemState };

// ============================================
// Thread List Types
// ============================================

export type ThreadListState = {
  threads: readonly ThreadListItemState[];
  isLoading: boolean;
  newThreadId: string | undefined;
};

export type ThreadListRuntime = {
  getState: () => ThreadListState;
  subscribe: (callback: () => void) => Unsubscribe;
  createThread: () => string;
  deleteThread: (threadId: string) => Promise<void>;
  switchToThread: (threadId: string) => void;
  switchToNewThread: () => string;
};

// ============================================
// Thread Runtime Types (Extended)
// ============================================

export type ThreadRuntimeState = {
  threadId: string;
  isRunning: boolean;
  isDisabled: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  messages: readonly ThreadMessage[];
  capabilities: ThreadCapabilities;
};

/**
 * Thread capabilities type.
 * This is an alias for RuntimeCapabilities from core.
 */
export type ThreadCapabilities = RuntimeCapabilities;

/**
 * Simplified AppendMessage type for react-native.
 * For full type, use CoreAppendMessage from @assistant-ui/core.
 */
export type AppendMessage = {
  role: "user" | "assistant";
  content: readonly { type: string; text?: string }[];
  parentId?: string | null;
};

// Re-export core's AppendMessage for users who need the full type
export type { CoreAppendMessage };

export type ThreadRuntime = {
  getState: () => ThreadRuntimeState;
  subscribe: (callback: () => void) => Unsubscribe;
  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;
};

// ============================================
// Composer Runtime Types
// ============================================

export type {
  ComposerRuntimeState,
  ComposerRuntime,
} from "../context/ComposerContext";

// ============================================
// Message Runtime Types
// ============================================

export type MessageRuntimeState = {
  message: ThreadMessage;
  parentId: string | null;
  isLast: boolean;
  branches: readonly string[];
  branchNumber: number;
  branchCount: number;
};

export type MessageRuntime = {
  getState: () => MessageRuntimeState;
  subscribe: (callback: () => void) => Unsubscribe;
  reload: () => void;
  speak: () => void;
  submitFeedback: (feedback: { type: "positive" | "negative" }) => void;
  switchToBranch: (branchId: string) => void;
};

// ============================================
// Assistant Runtime Types
// ============================================

export type AssistantRuntimeState = {
  isInitialized: boolean;
};

export type AssistantRuntime = {
  getState: () => AssistantRuntimeState;
  subscribe: (callback: () => void) => Unsubscribe;
  threadList: ThreadListRuntime;
  thread: ThreadRuntime;
  switchToThread: (threadId: string) => void;
  switchToNewThread: () => string;
};

// ============================================
// Subscribable utility type
// ============================================

/**
 * Simplified Subscribable type for react-native.
 * For more advanced subscribable patterns, use types from @assistant-ui/core.
 */
export type Subscribable<TState> = {
  getState: () => TState;
  subscribe: (callback: () => void) => Unsubscribe;
};

// Re-export core's Subscribable types for advanced use
export type { CoreSubscribable };
