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
import { ThreadRuntimeImpl } from "../../runtime/api/thread-runtime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import {
  captureThreadRuntimeGeneration,
  isThreadRuntimeGenerationCurrent,
  subscribeThreadRuntimeInvalidation,
} from "../../runtime/utils/thread-runtime-lifecycle";
import type { Unsubscribe } from "../../types/unsubscribe";
import { useSubscribable } from "./useSubscribable";
import { ThreadListItemClient } from "./thread-list-item-runtime-client";
import { ThreadClient } from "./thread-runtime-client";
import type { ThreadsState } from "../scopes/threads";
import { handleThreadListAction } from "./handle-thread-list-action";
import {
  createThreadRunStartBridge,
  type ThreadRunStartBridge,
  useThreadRunStartBridgeProvider,
} from "./thread-run-start-bridge";

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

const useBackgroundThreadRunEnd = (
  runtime: ThreadListRuntime,
  runStartBridge: ThreadRunStartBridge,
) => {
  const emit = useAssistantEmit();

  useEffect(() => {
    let currentThreadId = runtime.getState().mainThreadId;
    const runningThreads = new Map<
      string,
      {
        core: ThreadRuntimeCore;
        generation: number;
        runStartForwarded: boolean;
      }
    >();
    const pending = new Map<string, Unsubscribe>();
    const forwardedRunStarts = new Set<string>();

    const getMainThreadCore = () =>
      (runtime.main as ThreadRuntimeImpl).__internal_threadBinding.getState();
    const recordMainThread = (threadId: string, runStartForwarded = false) => {
      const core = getMainThreadCore();
      const generation = captureThreadRuntimeGeneration(core);
      const existing = runningThreads.get(threadId);
      const pendingRunStartForwarded = forwardedRunStarts.delete(threadId);
      const nextRunStartForwarded =
        runStartForwarded ||
        pendingRunStartForwarded ||
        (existing?.core === core &&
          existing.generation === generation &&
          existing.runStartForwarded);
      if (existing?.core === core && existing.generation === generation) {
        existing.runStartForwarded = nextRunStartForwarded;
        return;
      }
      runningThreads.set(threadId, {
        core,
        generation,
        runStartForwarded: nextRunStartForwarded,
      });
    };
    const trackRunningMainThread = (threadId: string) => {
      if (runtime.main.getState().isRunning) recordMainThread(threadId);
    };

    trackRunningMainThread(currentThreadId);
    const unsubscribeMainRunStart = runtime.main.unstable_on("runStart", () => {
      recordMainThread(runtime.getState().mainThreadId, true);
    });
    const unsubscribeMainRunEnd = runtime.main.unstable_on("runEnd", () => {
      const threadId = runtime.getState().mainThreadId;
      runningThreads.delete(threadId);
      forwardedRunStarts.delete(threadId);
    });
    const unsubscribeMainState = runtime.main.subscribe(() => {
      trackRunningMainThread(runtime.getState().mainThreadId);
    });

    const stopPending = (threadId: string) => {
      const unsubscribe = pending.get(threadId);
      if (!unsubscribe) return;
      pending.delete(threadId);
      runningThreads.delete(threadId);
      forwardedRunStarts.delete(threadId);
      unsubscribe();
    };

    const unsubscribeRuntime = runtime.subscribe(() => {
      const nextState = runtime.getState();
      for (const threadId of pending.keys()) {
        if (!Object.hasOwn(nextState.threadItems, threadId)) {
          stopPending(threadId);
        }
      }
      for (const threadId of runningThreads.keys()) {
        if (!Object.hasOwn(nextState.threadItems, threadId)) {
          runningThreads.delete(threadId);
          forwardedRunStarts.delete(threadId);
        }
      }

      const nextThreadId = nextState.mainThreadId;
      if (nextThreadId === currentThreadId) return;

      const previousThreadId = currentThreadId;
      currentThreadId = nextThreadId;
      const previousThread = runningThreads.get(previousThreadId);
      trackRunningMainThread(nextThreadId);

      const nextThread = runningThreads.get(nextThreadId);
      if (
        !nextThread?.runStartForwarded &&
        !forwardedRunStarts.has(nextThreadId) &&
        Object.hasOwn(nextState.threadItems, nextThreadId) &&
        runtime.getItemById(nextThreadId).getState().isRunning
      ) {
        forwardedRunStarts.add(nextThreadId);
        if (nextThread) nextThread.runStartForwarded = true;
        runStartBridge.emit(nextThreadId);
      }

      if (pending.has(previousThreadId)) return;

      if (
        !previousThread ||
        !Object.hasOwn(nextState.threadItems, previousThreadId) ||
        !runtime.getItemById(previousThreadId).getState().isRunning ||
        !isThreadRuntimeGenerationCurrent(
          previousThread.core,
          previousThread.generation,
        )
      ) {
        runningThreads.delete(previousThreadId);
        return;
      }

      if (!previousThread.runStartForwarded) {
        previousThread.runStartForwarded = true;
        emit("thread.runStart", { threadId: previousThreadId });
      }

      const unsubscribeBackgroundRunEnd = previousThread.core.unstable_on(
        "runEnd",
        () => {
          stopPending(previousThreadId);
          if (runtime.getState().mainThreadId === previousThreadId) return;
          emit("thread.runEnd", { threadId: previousThreadId });
        },
      );
      const unsubscribeInvalidation = subscribeThreadRuntimeInvalidation(
        previousThread.core,
        () => stopPending(previousThreadId),
      );
      pending.set(previousThreadId, () => {
        unsubscribeBackgroundRunEnd();
        unsubscribeInvalidation();
      });
    });

    return () => {
      unsubscribeRuntime();
      unsubscribeMainRunStart();
      unsubscribeMainRunEnd();
      unsubscribeMainState();
      for (const unsubscribe of pending.values()) unsubscribe();
    };
  }, [runtime, emit, runStartBridge]);
};

const useThreadListClientBody = ({
  runtime,
  __internal_assistantRuntime,
}: {
  runtime: ThreadListRuntime;
  __internal_assistantRuntime: AssistantRuntime;
}): ClientOutput<"threads"> => {
  const runtimeState = useSubscribable(runtime);
  useThreadSelectionEvents(runtimeState.mainThreadId);
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

const useThreadListClient = ({
  runtime,
  __internal_assistantRuntime,
}: {
  runtime: ThreadListRuntime;
  __internal_assistantRuntime: AssistantRuntime;
}): ClientOutput<"threads"> => {
  const runStartBridge = useMemo(() => createThreadRunStartBridge(), []);
  useBackgroundThreadRunEnd(runtime, runStartBridge);

  return useThreadRunStartBridgeProvider(
    runStartBridge,
    function useBoundThreadListClient() {
      return useThreadListClientBody({
        runtime,
        __internal_assistantRuntime,
      });
    },
  );
};

export const ThreadListClient = resource(useThreadListClient);
