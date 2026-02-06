import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import type { ChatInit } from "ai";
import type { AssistantCloud } from "../AssistantCloud";

// ============================================================================
// Thread Types
// ============================================================================

export type ThreadStatus = "regular" | "archived";

export type CloudThread = {
  id: string;
  title: string;
  status: ThreadStatus;
  externalId: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type UseThreadsOptions = {
  /** AssistantCloud instance */
  cloud: AssistantCloud;
  /** Include archived threads in the list. Default: false */
  includeArchived?: boolean;
  /** Enable thread fetching. Set to false when passing to useCloudChat which manages this internally. Default: true */
  enabled?: boolean;
};

export type UseThreadsResult = {
  /** The cloud instance used by this hook */
  cloud: AssistantCloud;
  /** List of threads */
  threads: CloudThread[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh the thread list */
  refresh: () => Promise<boolean>;
  /** Get a single thread by ID */
  get: (id: string) => Promise<CloudThread | null>;
  /** Create a new thread */
  create: (options?: { externalId?: string }) => Promise<CloudThread | null>;
  /** Delete a thread */
  delete: (id: string) => Promise<boolean>;
  /** Rename a thread */
  rename: (id: string, title: string) => Promise<boolean>;
  /** Archive a thread (removes from active list) */
  archive: (id: string) => Promise<boolean>;
  /** Unarchive a thread (restores to active list) */
  unarchive: (id: string) => Promise<boolean>;

  /** Current thread ID (null for new conversation) */
  threadId: string | null;
  /** Switch to a different thread or start new (null) */
  selectThread: (id: string | null) => void;
  /**
   * Generate a title for the specified thread using AI.
   * Loads messages from cloud and uses the built-in title generation assistant.
   * @param threadId - The thread ID to generate a title for
   * @returns The generated title, or null if generation failed
   */
  generateTitle: (threadId: string) => Promise<string | null>;
};

// ============================================================================
// Chat Types
// ============================================================================

export type UseCloudChatOptions = ChatInit<UIMessage> & {
  /** External thread management from useThreads(). If provided, internal threads are disabled. */
  threads?: UseThreadsResult;
  /** Cloud instance. Ignored if threads is UseThreadsResult. Falls back to NEXT_PUBLIC_ASSISTANT_BASE_URL env var. */
  cloud?: AssistantCloud;
  /** Callback invoked when a sync error occurs. */
  onSyncError?: (error: Error) => void;
};

export type UseCloudChatResult = UseChatHelpers<UIMessage> & {
  /** Thread management (internal or passed-through) */
  threads: UseThreadsResult;
};

/**
 * Internal metadata for tracking chat instance state.
 */
export type ChatMeta = {
  threadId: string | null;
  creatingThread: Promise<string> | null;
  loading: Promise<void> | null;
  loaded: boolean;
};
