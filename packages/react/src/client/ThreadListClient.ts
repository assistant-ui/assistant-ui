import { tapApi } from "../utils/tap-store";
import { resource, tapInlineResource, tapMemo } from "@assistant-ui/tap";
import { ThreadListRuntime } from "../api/ThreadListRuntime";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import {
  ThreadListItemClientState,
  ThreadListItemClientActions,
  ThreadListItemClient,
} from "./ThreadListItemClient";
import {
  ThreadClient,
  ThreadClientActions,
  ThreadClientState,
} from "./ThreadClient";
import { StoreApi } from "../utils/tap-store/tap-store-api";
import { tapLookupResources } from "./util-hooks/tapLookupResources";

export type ThreadListClientState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | undefined;
  readonly isLoading: boolean;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];

  readonly threadItems: readonly ThreadListItemClientState[];

  readonly main: ThreadClientState;
};

export type ThreadListClientActions = {
  switchToThread(threadId: string): void;
  switchToNewThread(): void;
  item(
    threadIdOrOptions: { id: string } | { index: number; archived: boolean },
  ): StoreApi<ThreadListItemClientState, ThreadListItemClientActions>;

  thread(selector: "main"): StoreApi<ThreadClientState, ThreadClientActions>;
};

const ThreadListItemClientById = resource(
  ({ runtime, id }: { runtime: ThreadListRuntime; id: string }) => {
    const threadListItemRuntime = tapMemo(
      () => runtime.getItemById(id),
      [runtime, id],
    );
    return tapInlineResource(
      ThreadListItemClient({ runtime: threadListItemRuntime }),
    );
  },
);

export const ThreadListClient = resource(
  ({ runtime }: { runtime: ThreadListRuntime }) => {
    const runtimeState = tapSubscribable(runtime);

    const main = tapInlineResource(ThreadClient({ runtime: runtime.main }));

    const threadItems = tapLookupResources(
      Object.keys(runtimeState.threadItems).map((id) =>
        ThreadListItemClientById({ runtime, id }, { key: id }),
      ),
    );

    const state = tapMemo<ThreadListClientState>(() => {
      return {
        mainThreadId: runtimeState.mainThreadId,
        newThreadId: runtimeState.newThread,
        isLoading: runtimeState.isLoading,
        threadIds: runtimeState.threads,
        archivedThreadIds: runtimeState.archivedThreads,
        threadItems: threadItems.state,

        main: main.state,
      };
    }, [runtimeState, threadItems.state, main.state]);

    const api = tapApi<ThreadListClientState, ThreadListClientActions>(state, {
      thread: () => main.api,

      item: (threadIdOrOptions) => {
        if ("id" in threadIdOrOptions) {
          // Object with id
          return runtime.getItemById(threadIdOrOptions.id);
        } else {
          // Object with index and optional archived
          const { index, archived } = threadIdOrOptions;
          return archived
            ? runtime.getArchivedItemByIndex(index)
            : runtime.getItemByIndex(index);
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
      api,
    };
  },
);
