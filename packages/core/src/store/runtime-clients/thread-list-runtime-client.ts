import { useMemo } from "react";
import { useResource, withKey, resource } from "@assistant-ui/tap";
import {
  type ClientOutput,
  useClientLookup,
  useClientResource,
} from "@assistant-ui/store";
import type { ThreadListRuntime } from "../../runtime/api/thread-list-runtime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { useSubscribable } from "./useSubscribable";
import { ThreadListItemClient } from "./thread-list-item-runtime-client";
import { ThreadClient } from "./thread-runtime-client";
import type { ThreadsState } from "../scopes/threads";

const useThreadListItemClientById = ({
  runtime,
  id,
}: {
  runtime: ThreadListRuntime;
  id: string;
}) => {
  const threadListItemRuntime = useMemo(
    () => runtime.getItemById(id),
    [runtime, id],
  );
  return useResource(
    ThreadListItemClient({
      runtime: threadListItemRuntime,
    }),
  );
};

const ThreadListItemClientById = resource(useThreadListItemClientById);

const useThreadListClient = ({
  runtime,
  __internal_assistantRuntime,
}: {
  runtime: ThreadListRuntime;
  __internal_assistantRuntime: AssistantRuntime;
}): ClientOutput<"threads"> => {
  const runtimeState = useSubscribable(runtime);

  const main = useClientResource(
    ThreadClient({
      runtime: runtime.main,
    }),
  );
  const threadItems = useClientLookup(
    Object.keys(runtimeState.threadItems).map((id) =>
      withKey(id, ThreadListItemClientById({ runtime, id }), [runtime, id]),
    ),
  );

  const state = useMemo<ThreadsState>(() => {
    return {
      mainThreadId: runtimeState.mainThreadId,
      newThreadId: runtimeState.newThreadId ?? null,
      isLoading: runtimeState.isLoading,
      isLoadingMore: runtimeState.isLoadingMore,
      hasMore: runtimeState.hasMore,
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
    switchToThread: async (threadId, options) => {
      await runtime.switchToThread(threadId, options);
    },
    switchToNewThread: async () => {
      await runtime.switchToNewThread();
    },
    getLoadThreadsPromise: () => runtime.getLoadThreadsPromise(),
    reload: () => runtime.reload(),
    loadMore: () => runtime.loadMore(),
    __internal_getAssistantRuntime: () => __internal_assistantRuntime,
  };
};

export const ThreadListClient = resource(useThreadListClient);
