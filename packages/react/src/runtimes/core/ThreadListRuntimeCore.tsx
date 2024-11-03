import { Unsubscribe } from "../../types";
import { ThreadMetadata, ThreadRuntimeCore } from "./ThreadRuntimeCore";

export type ThreadListRuntimeCore = {
  mainThread: ThreadRuntimeCore;

  newThread: string | undefined;
  threads: readonly string[];
  archivedThreads: readonly string[];

  getThreadMetadataById(threadId: string): ThreadMetadata | undefined;

  switchToThread(threadId: string): Promise<void>;
  switchToNewThread(): Promise<void>;

  // getLoadThreadsPromise(): Promise<void>;
  // getLoadArchivedThreadsPromise(): Promise<void>;
  // create(): Promise<ThreadMetadata>;
  rename(threadId: string, newTitle: string): Promise<void>;
  archive(threadId: string): Promise<void>;
  unarchive(threadId: string): Promise<void>;
  delete(threadId: string): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;
};
