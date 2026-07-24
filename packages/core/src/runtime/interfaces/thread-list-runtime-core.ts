import type { Unsubscribe } from "../../types/unsubscribe";
import type { ThreadRuntimeCore } from "./thread-runtime-core";
import type {
  ThreadForkedFrom,
  ThreadForkOptions,
} from "../../types/thread-fork";

export type ThreadListItemStatus = "archived" | "regular" | "new" | "deleted";

export type ThreadListItemCoreState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly forkedFrom?: ThreadForkedFrom | undefined;

  readonly status: ThreadListItemStatus;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;

  readonly runtime?: ThreadRuntimeCore | undefined;
};

export type ThreadListRuntimeCore = {
  readonly isLoading: boolean;
  readonly isLoadingMore?: boolean;
  readonly hasMore?: boolean;
  mainThreadId: string;
  newThreadId: string | undefined;

  threadIds: readonly string[];
  archivedThreadIds: readonly string[];

  readonly threadItems: Readonly<Record<string, ThreadListItemCoreState>>;

  getMainThreadRuntimeCore(): ThreadRuntimeCore;
  getThreadRuntimeCore(threadId: string): ThreadRuntimeCore;

  getItemById(threadId: string): ThreadListItemCoreState | undefined;

  switchToThread(
    threadId: string,
    options?: { unarchive?: boolean },
  ): Promise<void>;
  switchToNewThread(): Promise<void>;

  getLoadThreadsPromise(): Promise<void>;
  reload?(): Promise<void>;
  loadMore?(): Promise<void>;

  detach(threadId: string): Promise<void>;
  rename(threadId: string, newTitle: string): Promise<void>;
  updateCustom?(
    threadId: string,
    custom: Record<string, unknown> | undefined,
  ): Promise<void>;
  archive(threadId: string): Promise<void>;
  unarchive(threadId: string): Promise<void>;
  delete(threadId: string): Promise<void>;
  fork?(
    threadId: string,
    options?: ThreadForkOptions,
  ): Promise<{ threadId: string }>;

  initialize(
    threadId: string,
  ): Promise<{ remoteId: string; externalId: string | undefined }>;
  generateTitle(threadId: string): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;
};
