import { withKey, resource, tapResource, tapMemo } from "@assistant-ui/tap";
import { type ClientOutput, tapClientLookup, tapClientResource } from "../";
import { ThreadListRuntime, AssistantRuntime } from "../../runtime";
import { tapSubscribable } from "../utils/tap-subscribable";
import { ThreadListItemClient } from "./thread-list-item-runtime-client";
import { ThreadClient } from "./thread-runtime-client";
import { ThreadsState } from "../scopes";

const ThreadListItemClientById = resource(
  ({ runtime, id }: { runtime: ThreadListRuntime; id: string }) => {
    const threadListItemRuntime = tapMemo(
      () => runtime.getItemById(id),
      [runtime, id],
    );
    return tapResource(
      ThreadListItemClient({
        runtime: threadListItemRuntime,
      }),
    );
  },
);

export const ThreadListClient = resource(
  ({
    runtime,
    __internal_assistantRuntime,
  }: {
    runtime: ThreadListRuntime;
    __internal_assistantRuntime: AssistantRuntime;
  }): ClientOutput<"threads"> => {
    const runtimeState = tapSubscribable(runtime);

    const main = tapClientResource(
      ThreadClient({
        runtime: runtime.main,
      }),
    );
    const threadItems = tapClientLookup(
      () =>
        Object.keys(runtimeState.threadItems).map((id) =>
          withKey(id, ThreadListItemClientById({ runtime, id })),
        ),
      [runtimeState.threadItems, runtime],
    );

    const state = tapMemo<ThreadsState>(() => {
      return {
        mainThreadId: runtimeState.mainThreadId,
        newThreadId: runtimeState.newThreadId ?? null,
        isLoading: runtimeState.isLoading,
        threadIds: runtimeState.threadIds,
        archivedThreadIds: runtimeState.archivedThreadIds,
        threadItems: threadItems.state,

        main: main.state,
      };
    }, [runtimeState, threadItems.state, main.state]);

    return {
      getState: () => state,
      thread: () => main.methods,
      item: (threadIdOrOptions) => {
        if (threadIdOrOptions === "main") {
          return threadItems.get({ key: state.mainThreadId });
        }

        if ("id" in threadIdOrOptions) {
          return threadItems.get({ key: threadIdOrOptions.id });
        }

        const { index, archived = false } = threadIdOrOptions;
        const id = archived
          ? state.archivedThreadIds[index]!
          : state.threadIds[index]!;
        return threadItems.get({ key: id });
      },
      switchToThread: async (threadId) => {
        await runtime.switchToThread(threadId);
      },
      switchToNewThread: async () => {
        await runtime.switchToNewThread();
      },
      __internal_getAssistantRuntime: () => __internal_assistantRuntime,
    };
  },
);
