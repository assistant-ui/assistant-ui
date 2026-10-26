import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import { resource } from "@assistant-ui/tap";
import { useIsomorphicLayoutEffect } from "@assistant-ui/store/internal";
import {
  useAssistantContextProvider,
  useConfiguredAui,
  useDestroySignalProvider,
} from "@assistant-ui/store/client";
import { ThreadListItemClient } from "../../store/internal";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadRuntimeImpl } from "../../runtime/api/thread-runtime";
import {
  ThreadListItemRuntimeImpl,
  type ThreadListItemRuntime,
} from "../../runtime/api/thread-list-item-runtime";
import {
  SKIP_UPDATE,
  ShallowMemoizeSubject,
} from "../../subscribable/subscribable";
import {
  useRuntimeAdaptersProvider,
  type RuntimeAdapters,
} from "./RuntimeAdapterProvider";
import { useRemoteThreadRuntimeHostProvider } from "./RemoteThreadRuntimeHostContext";

export type RemoteThreadListHook = () => AssistantRuntime;

export type RemoteThreadResourceProps = {
  threadId: string;
  generation: number;
  parentList: ThreadListRuntimeCore;
  runtimeHook: RemoteThreadListHook;
  parentClient: Parameters<typeof useConfiguredAui>[0];
  adapters: RuntimeAdapters | null;
  publish: (
    threadId: string,
    runtime: ThreadRuntimeCore,
    generation: number,
  ) => void;
  destroySignal: AbortSignal;
  publishInCommit?: boolean;
};

const useRemoteThreadBinder = ({
  threadId,
  generation,
  runtimeHook,
  publish,
  itemRuntime,
  initializeForRun,
  publishInCommit,
}: {
  threadId: string;
  generation: number;
  runtimeHook: RemoteThreadListHook;
  publish: RemoteThreadResourceProps["publish"];
  itemRuntime: ThreadListItemRuntime;
  initializeForRun: ThreadListItemRuntime["initialize"];
  publishInCommit: boolean;
}) => {
  const runtime = useRemoteThreadRuntimeHostProvider(runtimeHook);
  const threadBinding = (runtime?.thread as ThreadRuntimeImpl | undefined)
    ?.__internal_threadBinding;

  const updateRuntime = useCallback(() => {
    if (!threadBinding) return;
    publish(threadId, threadBinding.getState(), generation);
  }, [threadId, generation, threadBinding, publish]);

  const isMounted = useRef(false);
  if (!publishInCommit && !isMounted.current) {
    updateRuntime();
  }

  useIsomorphicLayoutEffect(() => {
    if (!threadBinding) return undefined;
    isMounted.current = true;
    updateRuntime();
    return threadBinding.outerSubscribe(updateRuntime);
  }, [threadBinding, updateRuntime]);

  const remoteIdRef = useRef<string | undefined>(undefined);
  const applyRemoteId = useEffectEvent(() => {
    const remoteId = remoteIdRef.current;
    if (remoteId === undefined || !threadBinding) return;
    const core = threadBinding.getState();
    const setGetThreadId = (core as Record<string, unknown>)
      .__internal_setGetThreadId;
    if (typeof setGetThreadId === "function")
      setGetThreadId.call(core, () => remoteId);
  });
  useEffect(() => {
    applyRemoteId();
  }, [threadBinding]);

  const initPromiseRef = useRef<Promise<unknown> | undefined>(undefined);
  const hasInitializedRef = useRef(false);
  // Any caller's initialize() moves the item off "new"; a thread born "new"
  // here still joins that initialization so its first send waits for it.
  const bornNewRef = useRef(itemRuntime.getState().status === "new");

  const handleInitialize = useEffectEvent(() => {
    if (hasInitializedRef.current) return;

    if (itemRuntime.getState().status !== "new" && !bornNewRef.current) return;
    hasInitializedRef.current = true;
    bornNewRef.current = false;

    const initPromise = initializeForRun();
    initPromiseRef.current = initPromise;
    void initPromise.then(
      ({ remoteId }) => {
        remoteIdRef.current = remoteId;
        applyRemoteId();
      },
      () => {},
    );

    void initPromise.catch(() => {
      if (initPromiseRef.current === initPromise) {
        initPromiseRef.current = undefined;
        hasInitializedRef.current = false;
      }
    });
  });

  const getInitializePromise = useEffectEvent(() => {
    handleInitialize();
    return initPromiseRef.current;
  });

  useEffect(() => {
    if (!threadBinding) return;
    const runtimeCore = threadBinding.getState();
    const setGetInitializePromise = (runtimeCore as Record<string, unknown>)
      .__internal_setGetInitializePromise;
    if (typeof setGetInitializePromise === "function") {
      setGetInitializePromise.call(runtimeCore, getInitializePromise);
    }
  }, [threadBinding]);
  useEffect(() => {
    if (!runtime?.threads?.main) return undefined;
    hasInitializedRef.current = false;
    return runtime.threads.main.unstable_on("initialize", handleInitialize);
  }, [runtime]);

  return runtime;
};

const useRemoteThreadResource = ({
  threadId,
  generation,
  parentList,
  runtimeHook,
  parentClient,
  adapters,
  publish,
  destroySignal,
  publishInCommit = false,
}: RemoteThreadResourceProps) => {
  const itemRuntime = useMemo(
    () =>
      new ThreadListItemRuntimeImpl(
        new ShallowMemoizeSubject({
          path: {
            ref: `threadItems[threadId=${threadId}]`,
            threadSelector: { type: "threadId", threadId },
          },
          getState: () => {
            const data = parentList.getItemById(threadId);
            if (!data) return SKIP_UPDATE;
            return {
              id: data.id,
              remoteId: data.remoteId,
              externalId: data.externalId,
              title: data.title,
              lastMessageAt: data.lastMessageAt,
              custom: data.custom,
              status: data.status,
              isMain: data.id === parentList.mainThreadId,
              isRunning:
                parentList.unstable_isThreadRunning?.(data.id) ?? false,
            };
          },
          subscribe: (callback) => parentList.subscribe(callback),
        }),
        parentList,
      ),
    [parentList, threadId],
  );
  // The first send's run waits on this. A list whose initialize waits for its
  // own report of the remote ID (ClientThreadListRuntimeCore) offers one that
  // does not, since the run needs only the remote ID the result carries.
  const initializeForRun = useMemo(() => {
    const list = parentList as ThreadListRuntimeCore & {
      __internal_initializeForRun?: (
        threadId: string,
      ) => ReturnType<ThreadListItemRuntime["initialize"]>;
    };
    if (!list.__internal_initializeForRun) return itemRuntime.initialize;
    return () => list.__internal_initializeForRun!(itemRuntime.getState().id);
  }, [parentList, itemRuntime]);

  const { client } = useConfiguredAui(parentClient, {
    threadListItem: ThreadListItemClient({ runtime: itemRuntime }),
  });

  return useDestroySignalProvider(destroySignal, function useOwnedThread() {
    return useAssistantContextProvider(client, function useThreadClient() {
      return useRuntimeAdaptersProvider(adapters, function useBoundRuntime() {
        return useRemoteThreadBinder({
          threadId,
          generation,
          runtimeHook,
          publish,
          itemRuntime,
          initializeForRun,
          publishInCommit,
        });
      });
    });
  });
};

export const RemoteThreadResource = resource(useRemoteThreadResource);
