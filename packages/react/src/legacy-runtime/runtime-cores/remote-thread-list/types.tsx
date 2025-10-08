import { ComponentType, PropsWithChildren } from "react";
import { AssistantRuntime } from "../../runtime";
import { AssistantStream } from "assistant-stream";
import { ThreadMessage } from "../../../types";

export type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
};

export type RemoteThreadMetadata = {
  /** Thread status - regular threads appear in main list, archived threads in archive */
  readonly status: "regular" | "archived";
  /** Unique identifier for the thread in your database */
  readonly remoteId: string;
  /** Optional external identifier for integration with other systems */
  readonly externalId?: string | undefined;
  /** Thread title shown in the UI */
  readonly title?: string | undefined;
};

export type RemoteThreadListResponse = {
  threads: RemoteThreadMetadata[];
};

export type RemoteThreadListAdapter = {
  /**
   * Return all threads (regular and archived). Called on mount and when refreshing the thread list.
   */
  list(): Promise<RemoteThreadListResponse>;

  /**
   * Create a new thread record when user sends first message. Return the canonical remoteId used for all future operations on this thread.
   */
  initialize(threadId: string): Promise<RemoteThreadInitializeResponse>;

  /**
   * Update thread title. Called when user renames a thread in the UI.
   */
  rename(remoteId: string, newTitle: string): Promise<void>;

  /**
   * Mark thread as archived. Throw error to revert optimistic UI update.
   */
  archive(remoteId: string): Promise<void>;

  /**
   * Restore archived thread to regular status.
   */
  unarchive(remoteId: string): Promise<void>;

  /**
   * Permanently delete thread and all its messages. Throw error to prevent deletion.
   */
  delete(remoteId: string): Promise<void>;

  /**
   * Generate and return a title for the thread. Must return AssistantStream (use createAssistantStream). Called automatically or via UI action.
   */
  generateTitle(
    remoteId: string,
    unstable_messages: readonly ThreadMessage[],
  ): Promise<AssistantStream>;

  /**
   * Component that wraps each thread runtime. Use this to inject thread-specific adapters like history and attachments via RuntimeAdapterProvider. Has access to useThreadListItem hook.
   */
  unstable_Provider?: ComponentType<PropsWithChildren>;
};

export type RemoteThreadListOptions = {
  runtimeHook: () => AssistantRuntime;
  adapter: RemoteThreadListAdapter;
};
