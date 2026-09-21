import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type {
  ThreadListItemMethods,
  ThreadListItemState,
} from "./thread-list-item";
import type { ThreadMethods, ThreadState } from "./thread";

export type ThreadsState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | null;
  readonly isLoading: boolean;
  readonly loadError: unknown;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadItems: readonly ThreadListItemState[];
  readonly main: ThreadState;
};

export type ThreadsMethods = {
  getState(): ThreadsState;
  switchToThread(threadId: string, options?: { unarchive?: boolean }): void;
  switchToNewThread(): void;
  item(
    threadIdOrOptions:
      | "main"
      | { id: string }
      | { index: number; archived?: boolean },
  ): ThreadListItemMethods;
  thread(selector: "main"): ThreadMethods;
  getLoadThreadsPromise(): Promise<void>;
  reload(): Promise<void>;
  reloadMainThread(): Promise<void>;
  loadMore(): Promise<void>;
  __internal_getAssistantRuntime?(): AssistantRuntime;
};

export type ThreadsEvents = {
  /**
   * The main thread selection changed. Fires once per switch with the newly
   * selected thread and the thread that was selected before. Does not fire
   * for the initially selected thread on mount. Runtimes that resolve a
   * deep-linked `threadId`/`initialThreadId` after mount (such as
   * `useRemoteThreadListRuntime`) start on a placeholder new thread, so the
   * deep link's resolution fires this event with the placeholder as
   * `previousThreadId`.
   */
  "threads.selectionChanged": { threadId: string; previousThreadId: string };
};

export type ThreadsClientSchema = {
  methods: ThreadsMethods;
  events: ThreadsEvents;
};
