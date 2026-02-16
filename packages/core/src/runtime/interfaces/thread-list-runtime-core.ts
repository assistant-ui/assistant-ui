import type { Unsubscribe } from "../../types";
import type { ThreadRuntimeCore } from "./thread-runtime-core";

export type ThreadListItemStatus = "archived" | "regular" | "new" | "deleted";

export type ThreadListItemCoreState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;

  readonly status: ThreadListItemStatus;
  readonly title?: string | undefined;

  readonly runtime?: ThreadRuntimeCore | undefined;
};

export type ThreadListRuntimeCore = {
  readonly isLoading: boolean;
  mainThreadId: string;
  newThreadId: string | undefined;

  threadIds: readonly string[];
  archivedThreadIds: readonly string[];

  readonly threadItems: Readonly<Record<string, ThreadListItemCoreState>>;

  getMainThreadRuntimeCore(): ThreadRuntimeCore;
  getThreadRuntimeCore(threadId: string): ThreadRuntimeCore;

  getItemById(threadId: string): ThreadListItemCoreState | undefined;

  switchToThread(threadId: string): Promise<void>;
  switchToNewThread(): Promise<void>;

  getLoadThreadsPromise(): Promise<void>;

  detach(threadId: string): Promise<void>;
  rename(threadId: string, newTitle: string): Promise<void>;
  archive(threadId: string): Promise<void>;
  unarchive(threadId: string): Promise<void>;
  delete(threadId: string): Promise<void>;

  initialize(
    threadId: string,
  ): Promise<{ remoteId: string; externalId: string | undefined }>;
  generateTitle(threadId: string): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;
};
