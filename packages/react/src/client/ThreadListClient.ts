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
  switchToThread(threadId: string): void;
  switchToNewThread(): void;
  item(
    threadIdOrOptions: { id: string } | { index: number; archived: boolean },
  ): ThreadListItemClientActions;

  readonly main: ThreadClientActions;
};

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
        if (typeof threadIdOrOptions === "string") {
          // Direct threadId
          return runtimeRef.current.getItemById(threadIdOrOptions);
        } else if ("id" in threadIdOrOptions) {
          // Object with id
          return runtimeRef.current.getItemById(threadIdOrOptions.id);
        } else {
          // Object with index and optional archived
          const { index, archived } = threadIdOrOptions;
          return archived
            ? runtimeRef.current.getArchivedItemByIndex(index)
            : runtimeRef.current.getItemByIndex(index);
        }
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
