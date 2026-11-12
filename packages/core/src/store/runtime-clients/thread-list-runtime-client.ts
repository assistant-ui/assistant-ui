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
import { useAfterStateCommit } from "./useAfterStateCommit";
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

const createThreadListEventEffect =
  (runtime: ThreadListRuntime, emit: ReturnType<typeof useAssistantEmit>) =>
  () =>
    runtime.unstable_subscribeThreadEvents(({ threadId, type }) => {
      if (threadId === runtime.getState().mainThreadId) return;
      emit(`thread.${type}`, { threadId });
    });

function createValueAccessor<T>(value: T) {
  return () => value;
}

const createSwitchToThread =
  (runtime: ThreadListRuntime): ClientOutput<"threads">["switchToThread"] =>
  (threadId, options) =>
    handleThreadListAction("switch", () =>
      runtime.switchToThread(threadId, options),
    );

const createSwitchToNewThread = (runtime: ThreadListRuntime) => () =>
  handleThreadListAction("create", () => runtime.switchToNewThread());

const createGetLoadThreadsPromise =
  (
    runtime: ThreadListRuntime,
    afterStateCommit: ReturnType<typeof useAfterStateCommit>,
  ) =>
  () =>
    afterStateCommit(runtime.getLoadThreadsPromise());

const createReloadThreads =
  (
    runtime: ThreadListRuntime,
    afterStateCommit: ReturnType<typeof useAfterStateCommit>,
  ) =>
  () =>
    afterStateCommit(runtime.reload());

const createLoadMoreThreads =
  (
    runtime: ThreadListRuntime,
    afterStateCommit: ReturnType<typeof useAfterStateCommit>,
  ) =>
  () =>
    afterStateCommit(runtime.loadMore());

const useThreadListClient = ({
  runtime,
  __internal_assistantRuntime,
}: {
  runtime: ThreadListRuntime;
  __internal_assistantRuntime: AssistantRuntime;
}): ClientOutput<"threads"> => {
  const runtimeState = useSubscribable(runtime);
  const afterStateCommit = useAfterStateCommit(runtimeState, runtime.getState);
  useThreadSelectionEvents(runtimeState.mainThreadId);

  const emit = useAssistantEmit();
  useEffect(createThreadListEventEffect(runtime, emit), [runtime, emit]);

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
      canUnarchive: runtimeState.canUnarchive,
      mainThreadId: runtimeState.mainThreadId,
      newThreadId: runtimeState.newThreadId ?? null,
      isLoading: runtimeState.isLoading,
      loadError: runtimeState.loadError,
      switchError: runtimeState.switchError,
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
    thread: createValueAccessor(main.methods),
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
    switchToThread: createSwitchToThread(runtime),
    switchToNewThread: createSwitchToNewThread(runtime),
    getLoadThreadsPromise: createGetLoadThreadsPromise(
      runtime,
      afterStateCommit,
    ),
    reload: createReloadThreads(runtime, afterStateCommit),
    reloadMainThread: runtime.reloadMainThread,
    loadMore: createLoadMoreThreads(runtime, afterStateCommit),
    __internal_getAssistantRuntime: createValueAccessor(
      __internal_assistantRuntime,
    ),
  };
};

export const ThreadListClient = resource(useThreadListClient);
