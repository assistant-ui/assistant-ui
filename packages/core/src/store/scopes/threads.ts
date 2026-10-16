import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type {
  ThreadListItemMethods,
  ThreadListItemState,
} from "./thread-list-item";
import type { ThreadMethods, ThreadState } from "./thread";
import type { ThreadMessage } from "../../types/message";

export type ThreadsState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | null;
  readonly isLoading: boolean;
  readonly loadError: unknown;
  /** The most recent thread switch that failed: the id it was asked to open and the error it threw. Cleared when a later switch starts or that thread opens. A switch to a controlled `threadId` is retried when the browser comes back online or the tab becomes visible. */
  readonly switchError:
    | { readonly threadId: string; readonly error: unknown }
    | undefined;
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
  /**
   * Resolves once `getState()` reports the loaded thread list, or its `loadError` when loading fails.
   * If the client cannot commit within 100ms, as inside the React `act()` scope that completes the load or under a Suspense boundary that hides the client, it resolves anyway and `getState()` may not report the list yet.
   */
  getLoadThreadsPromise(): Promise<void>;
  /** Refetches the thread list; resolves like `getLoadThreadsPromise()`. */
  reload(): Promise<void>;
  reloadMainThread(): Promise<void>;
  /**
   * Loads the next page; resolves once `getState()` reports it, or after a failed request, which is logged.
   * If the client cannot commit within 100ms, as inside the React `act()` scope that completes the load or under a Suspense boundary that hides the client, it resolves anyway and `getState()` may not report the list yet.
   */
  loadMore(): Promise<void>;
  __internal_getAssistantRuntime?(): AssistantRuntime;
  __internal_getRawActions?(): {
    switchToThread(
      threadId: string,
      options?: { unarchive?: boolean },
      emitThreadIdChange?: boolean,
    ): Promise<void>;
    switchToNewThread(emitThreadIdChange?: boolean): Promise<void>;
    rename(threadId: string, title: string): Promise<void>;
    archive(threadId: string): Promise<void>;
    unarchive(threadId: string): Promise<void>;
    delete(threadId: string): Promise<void>;
    detach(threadId: string): Promise<void>;
    generateTitle(
      threadId: string,
      messages: readonly ThreadMessage[] | undefined,
      options?: { automatic?: boolean },
    ): Promise<void>;
    initialize(threadId: string): Promise<{
      remoteId: string;
      externalId: string | undefined;
    }>;
    reload(): Promise<void>;
    reloadMainThread(): Promise<void>;
    getLoadThreadsPromise(): Promise<void>;
    loadMore(): Promise<void>;
  };
  __internal_getThreadBody?(threadId: string): ThreadMethods | undefined;
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
