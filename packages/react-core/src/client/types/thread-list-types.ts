export type ThreadListState = {
  readonly mainThreadId: string;
  readonly newThread: string | undefined;
  readonly threads: readonly string[];
  readonly archivedThreads: readonly string[];
  readonly isLoading: boolean;
};

export type ThreadListActions = {
  //   readonly main: ThreadRuntime;
  //   getById(threadId: string): ThreadRuntime;

  //   readonly mainItem: ThreadListItemRuntime;
  //   getItemById(threadId: string): ThreadListItemRuntime;
  //   getItemByIndex(idx: number): ThreadListItemRuntime;
  //   getArchivedItemByIndex(idx: number): ThreadListItemRuntime;

  switchToThread(threadId: string): Promise<void>;
  switchToNewThread(): Promise<void>;
};
