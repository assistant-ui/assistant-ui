import { tapApi } from "../../utils/tap-store";
import { resource, tapInlineResource, tapMemo } from "@assistant-ui/tap";
import { ThreadListRuntime } from "../runtime/ThreadListRuntime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import {
  ThreadListItemClientState,
  ThreadListItemClientActions,
  ThreadListItemClient,
} from "./ThreadListItemRuntimeClient";
import {
  ThreadClient,
  ThreadClientActions,
  ThreadClientState,
} from "./ThreadRuntimeClient";
import { StoreApi } from "../../utils/tap-store/tap-store-api";
import { tapLookupResources } from "../util-hooks/tapLookupResources";
import { EventManagerActions } from "./EventManagerRuntimeClient";

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
    threadIdOrOptions:
      | "main"
      | { id: string }
      | { index: number; archived?: boolean },
  ): StoreApi<ThreadListItemClientState, ThreadListItemClientActions>;

  thread(selector: "main"): StoreApi<ThreadClientState, ThreadClientActions>;
};

const ThreadListItemClientById = resource(
  ({
    runtime,
    id,
    events,
  }: {
    runtime: ThreadListRuntime;
    id: string;
    events: EventManagerActions;
  }) => {
    const threadListItemRuntime = tapMemo(
      () => runtime.getItemById(id),
      [runtime, id],
    );
    return tapInlineResource(
      ThreadListItemClient({
        runtime: threadListItemRuntime,
        events,
      }),
    );
  },
);

export const ThreadListClient = resource(
  ({
    runtime,
    events,
  }: {
    runtime: ThreadListRuntime;
    events: EventManagerActions;
  }) => {
    const runtimeState = tapSubscribable(runtime);

    const main = tapInlineResource(
      ThreadClient({
        runtime: runtime.main,
        events,
      }),
    );

    const threadItems = tapLookupResources(
      Object.keys(runtimeState.threadItems).map((id) =>
        ThreadListItemClientById({ runtime, id, events }, { key: id }),
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
        if (threadIdOrOptions === "main") {
          return threadItems.api({ key: state.mainThreadId });
        }

        if ("id" in threadIdOrOptions) {
          return threadItems.api({ key: threadIdOrOptions.id });
        }

        const { index, archived = false } = threadIdOrOptions;
        const id = archived
          ? state.archivedThreadIds[index]!
          : state.threadIds[index]!;
        return threadItems.api({ key: id });
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
