import { useEffect, useMemo } from "react";
import { useResource, withKey, resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import {
  useAssistantEmit,
  useClientLookup,
  useClientResource,
} from "@assistant-ui/store/client";
import { useThreadSelectionEvents } from "../clients/thread-selection-events";
import type { ThreadListRuntime } from "../../runtime/api/thread-list-runtime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { useSubscribable } from "./useSubscribable";
import { ThreadListItemClient } from "./thread-list-item-runtime-client";
import { ThreadClient } from "./thread-runtime-client";
import type { ThreadsState } from "../scopes/threads";
import { handleThreadListAction } from "./handle-thread-list-action";

const useThreadListItemClientById = ({
  runtime,
  id,
  mainThreadIsRunning,
}: {
  runtime: ThreadListRuntime;
  id: string;
  mainThreadIsRunning: boolean;
}) => {
  const threadListItemRuntime = useMemo(
    () => runtime.getItemById(id),
    [runtime, id],
  );
  return useResource(
    ThreadListItemClient({
      runtime: threadListItemRuntime,
      mainThreadIsRunning,
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
  useThreadSelectionEvents(runtimeState.mainThreadId);

  const emit = useAssistantEmit();
  useEffect(
    () =>
      runtime.unstable_subscribeThreadEvents(({ threadId, type }) => {
        if (threadId === runtime.getState().mainThreadId) return;
        emit(`thread.${type}`, { threadId });
      }),
    [runtime, emit],
  );

  const main = useClientResource(
    ThreadClient({
      runtime: runtime.main,
    }),
  );
  const threadItems = useClientLookup(
    Object.keys(runtimeState.threadItems).map((id) =>
      withKey(
        id,
        ThreadListItemClientById({
          runtime,
          id,
          mainThreadIsRunning: main.state.isRunning,
        }),
        [runtime, id, main.state.isRunning],
      ),
    ),
  );

  const state = useMemo<ThreadsState>(() => {
    return {
      mainThreadId: runtimeState.mainThreadId,
      newThreadId: runtimeState.newThreadId ?? null,
      isLoading: runtimeState.isLoading,
      loadError: runtimeState.loadError,
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
    switchToThread: (threadId, options) =>
      handleThreadListAction("switch", () =>
        runtime.switchToThread(threadId, options),
      ),
    switchToNewThread: () =>
      handleThreadListAction("create", () => runtime.switchToNewThread()),
    getLoadThreadsPromise: () => runtime.getLoadThreadsPromise(),
    reload: () => runtime.reload(),
    reloadMainThread: () => runtime.reloadMainThread(),
    loadMore: () => runtime.loadMore(),
    __internal_getAssistantRuntime: () => __internal_assistantRuntime,
  };
};

export const ThreadListClient = resource(useThreadListClient);
