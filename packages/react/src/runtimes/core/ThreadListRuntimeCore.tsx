import { Unsubscribe } from "../../types";
import { ThreadRuntimeCore } from "./ThreadRuntimeCore";

export type ThreadListMetadata = Readonly<{
  threadId: string;
  title?: string;
}>;

export type ThreadListRuntimeCore = {
  mainThread: ThreadRuntimeCore;

  threads: readonly ThreadListMetadata[];
  archivedThreads: readonly ThreadListMetadata[];

  getThreadMetadataById(threadId: string): ThreadListMetadata | undefined;

  switchToThread(threadId: string): void;
  switchToNewThread(): void;

  // getLoadThreadsPromise(): Promise<void>;
  // getLoadArchivedThreadsPromise(): Promise<void>;
  // create(): Promise<ThreadMetadata>;
  rename(threadId: string, newTitle: string): Promise<void>;
  archive(threadId: string): Promise<void>;
  unarchive(threadId: string): Promise<void>;
  delete(threadId: string): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;
};
