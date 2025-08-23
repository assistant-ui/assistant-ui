import { tapActions } from "../utils/tap-store";
import { resource, tapInlineResource, tapMemo } from "@assistant-ui/tap";
import { tapRefValue } from "./util-hooks/tapRefValue";
import { ThreadListRuntime } from "../api/ThreadListRuntime";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import {
  ThreadListItemClientState,
  ThreadListItemClientActions,
} from "./ThreadListItemClient";
import {
  ThreadClient,
  ThreadClientActions,
  ThreadClientState,
} from "./ThreadClient";
import { ThreadListItemEventType } from "../api/ThreadListItemRuntime";

export type ThreadListClientState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | undefined;
  readonly isLoading: boolean;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];

  readonly threadItems: Readonly<Record<string, ThreadListItemClientState>>;

  readonly main: ThreadClientState;
};

export type ThreadListClientActions = {
  readonly switchToThread: (threadId: string) => void;
  readonly switchToNewThread: () => void;
  readonly item: (
    threadIdOrOptions:
      | string
      | { id: string }
      | { index: number; archived: boolean },
  ) => ThreadListItemClientActions;

  readonly main: ThreadClientActions;
};

class ThreadListItemClientActionsImpl implements ThreadListItemClientActions {
  constructor(
    private readonly getRuntime: () => ReturnType<
      ThreadListRuntime["getItemById"]
    >,
  ) {}

  switchTo() {
    this.getRuntime().switchTo();
  }

  rename(newTitle: string) {
    this.getRuntime().rename(newTitle);
  }

  archive() {
    this.getRuntime().archive();
  }

  unarchive() {
    this.getRuntime().unarchive();
  }

  delete() {
    this.getRuntime().delete();
  }

  generateTitle() {
    this.getRuntime().generateTitle();
  }

  initialize() {
    return this.getRuntime().initialize();
  }

  detach() {
    this.getRuntime().detach();
  }

  unstable_on(event: ThreadListItemEventType, callback: () => void) {
    return this.getRuntime().unstable_on(event, callback);
  }
}

export const ThreadListClient = resource(
  ({ runtime }: { runtime: ThreadListRuntime }) => {
    const runtimeState = tapSubscribable(runtime);
    const runtimeRef = tapRefValue(runtime);

    const main = tapInlineResource(ThreadClient({ runtime: runtime.main }));

    const state = tapMemo<ThreadListClientState>(() => {
      return {
        mainThreadId: runtimeState.mainThreadId,
        newThreadId: runtimeState.newThread,
        isLoading: runtimeState.isLoading,
        threadIds: runtimeState.threads,
        archivedThreadIds: runtimeState.archivedThreads,
        threadItems: runtimeState.threadItems,

        main: main.state,
      };
    }, [runtimeState, main.state]);

    const actions = tapActions<ThreadListClientActions>({
      main: main.actions,

      item: (threadIdOrOptions) => {
        let getRuntime: () => ReturnType<ThreadListRuntime["getItemById"]>;

        if (typeof threadIdOrOptions === "string") {
          // Direct threadId
          getRuntime = () => runtimeRef.current.getItemById(threadIdOrOptions);
        } else if ("id" in threadIdOrOptions) {
          // Object with id
          getRuntime = () =>
            runtimeRef.current.getItemById(threadIdOrOptions.id);
        } else {
          // Object with index and optional archived
          const { index, archived } = threadIdOrOptions;
          getRuntime = () =>
            archived
              ? runtimeRef.current.getArchivedItemByIndex(index)
              : runtimeRef.current.getItemByIndex(index);
        }

        return new ThreadListItemClientActionsImpl(getRuntime);
      },

      switchToThread: (threadId) => {
        runtime.switchToThread(threadId);
      },
      switchToNewThread: () => {
        runtime.switchToNewThread();
      },
    });

    return {
      state,
      actions,
    };
  },
);
