import type { Unsubscribe, ThreadMessage } from "@assistant-ui/core";

// ============================================
// Thread List Types
// ============================================

export type ThreadListItemState = {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  status: "idle" | "active" | "archived";
};

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

export type ThreadCapabilities = {
  switchToBranch: boolean;
  edit: boolean;
  reload: boolean;
  cancel: boolean;
  unstable_copy: boolean;
  speech: boolean;
  attachments: boolean;
  feedback: boolean;
};

export type AppendMessage = {
  role: "user" | "assistant";
  content: readonly { type: string; text?: string }[];
  parentId?: string | null;
};

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

export type Subscribable<TState> = {
  getState: () => TState;
  subscribe: (callback: () => void) => Unsubscribe;
};
