import { Unsubscribe } from "../../types";
import { ThreadRuntimeCore } from "./ThreadRuntimeCore";

export type ThreadManagerMetadata = Readonly<{
  threadId: string;
  title?: string;
}>;

export type ThreadManagerRuntimeCore = {
  mainThread: ThreadRuntimeCore;

  threads: readonly ThreadManagerMetadata[];
  archivedThreads: readonly ThreadManagerMetadata[];

  getThreadMetadataById(threadId: string): ThreadManagerMetadata | undefined;

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
