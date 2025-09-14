import { tapApi } from "../../utils/tap-store";
import { resource, tapInlineResource, tapMemo } from "@assistant-ui/tap";
import { ThreadListRuntime } from "../runtime/ThreadListRuntime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { ThreadListItemClient } from "./ThreadListItemRuntimeClient";
import { ThreadClient } from "./ThreadRuntimeClient";
import { tapLookupResources } from "../../client/util-hooks/tapLookupResources";
import {
  ThreadListClientState,
  ThreadListClientApi,
} from "../../client/types/ThreadList";

const ThreadListItemClientById = resource(
  ({ runtime, id }: { runtime: ThreadListRuntime; id: string }) => {
    const threadListItemRuntime = tapMemo(
      () => runtime.getItemById(id),
      [runtime, id],
    );
    return tapInlineResource(
      ThreadListItemClient({
        runtime: threadListItemRuntime,
      }),
    );
  },
);

export const ThreadListClient = resource(
  ({ runtime }: { runtime: ThreadListRuntime }) => {
    const runtimeState = tapSubscribable(runtime);

    const main = tapInlineResource(
      ThreadClient({
        runtime: runtime.main,
      }),
    );

    const threadItems = tapLookupResources(
      Object.keys(runtimeState.threadItems).map((id) =>
        ThreadListItemClientById({ runtime, id }, { key: id }),
      ),
    );

    const state = tapMemo<ThreadListClientState>(() => {
      return {
        mainThreadId: runtimeState.mainThreadId,
        newThreadId: runtimeState.newThread ?? null,
        isLoading: runtimeState.isLoading,
        threadIds: runtimeState.threads,
        archivedThreadIds: runtimeState.archivedThreads,
        threadItems: threadItems.state,

        main: main.state,
      };
    }, [runtimeState, threadItems.state, main.state]);

    return tapApi<ThreadListClientApi>({
      getState: () => state,

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
  },
);
