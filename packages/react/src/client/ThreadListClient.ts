import { tapActions } from "@assistant-ui/react-core";
import { resource, tapMemo, tapResource } from "@assistant-ui/tap";
import { tapRefValue } from "./util-hooks/tapRefValue";
import { ThreadListRuntimeImpl } from "../api/ThreadListRuntime";
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
  readonly newThread: string | undefined;
  readonly isLoading: boolean;
  readonly threads: readonly string[];
  readonly archivedThreads: readonly string[];

  readonly threadItems: Readonly<
    Record<string, Omit<ThreadListItemClientState, "isMain">>
  >;

  readonly main: ThreadClientState;
};

export type ThreadListClientActions = {
  readonly switchToThread: (threadId: string) => void;
  readonly switchToNewThread: () => void;
  readonly item: (threadId: string) => ThreadListItemClientActions;

  readonly main: ThreadClientActions;
};

export const ThreadListClient = resource(
  ({ runtime }: { runtime: ThreadListRuntimeImpl }) => {
    const runtimeState = tapSubscribable(runtime);
    const runtimeRef = tapRefValue(runtime);

    const main = tapResource(ThreadClient({ runtime: runtime.main }));

    const state = tapMemo<ThreadListClientState>(() => {
      return {
        mainThreadId: runtimeState.mainThreadId,
        newThread: runtimeState.newThread,
        isLoading: runtimeState.isLoading,
        threads: runtimeState.threads,
        archivedThreads: runtimeState.archivedThreads,
        threadItems: runtimeState.threadItems,

        main: main.state,
      };
    }, [runtime.main]);

    const actions = tapActions<ThreadListClientActions>({
      main: main.actions,

      item: (threadId) => {
        return {
          switchTo: () => {
            runtimeRef.current.switchToThread(threadId);
          },
          rename: (newTitle) => {
            runtimeRef.current.getItemById(threadId).rename(newTitle);
          },
          archive: () => {
            runtimeRef.current.getItemById(threadId).archive();
          },
          unarchive: () => {
            runtimeRef.current.getItemById(threadId).unarchive();
          },
          delete: () => {
            runtimeRef.current.getItemById(threadId).delete();
          },
          generateTitle: () => {
            runtimeRef.current.getItemById(threadId).generateTitle();
          },
          initialize: async () => {
            return runtimeRef.current.getItemById(threadId).initialize();
          },
          detach: () => {
            runtimeRef.current.getItemById(threadId).detach();
          },
          unstable_on: (event, callback) => {
            return runtimeRef.current
              .getItemById(threadId)
              .unstable_on(event, callback);
          },
        };
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
