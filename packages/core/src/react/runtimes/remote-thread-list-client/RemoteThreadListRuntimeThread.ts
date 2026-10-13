import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { resource } from "@assistant-ui/tap";
import { useAui } from "@assistant-ui/store";
import { useClientResource } from "@assistant-ui/store/client";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import type { ThreadRuntimeImpl } from "../../../runtime/api/thread-runtime";
import type { ThreadRuntimeCore } from "../../../runtime/interfaces/thread-runtime-core";
import { disposeThreadRuntime } from "../../../runtime/utils/thread-runtime-lifecycle";
import type { ModelContextProvider } from "../../../model-context/types";
import type { RemoteThreadListOptions } from "../../../runtimes/remote-thread-list/types";
import { WritableSubscribable } from "../../../subscribable/subscribable";
import { ThreadClient } from "../../../store/runtime-clients/thread-runtime-client";
import { useSubscribable } from "../../../store/runtime-clients/useSubscribable";
import { useRemoteThreadRuntimeHostProvider } from "../RemoteThreadRuntimeHostContext";
import {
  useRuntimeAdapters,
  useRuntimeAdaptersProvider,
} from "../useRuntimeAdapters";

const useRemoteThreadListRuntimeThread = ({
  optionsStore,
  modelContext,
}: {
  optionsStore: WritableSubscribable<RemoteThreadListOptions>;
  modelContext: ModelContextProvider;
}) => {
  const aui = useAui();
  const destroySignal = useAssistantClientDestroySignal();
  const inheritedAdapters = useRuntimeAdapters();
  const adapters = useMemo(
    () => ({ modelContext, ...inheritedAdapters }),
    [modelContext, inheritedAdapters],
  );
  const runtimeHook = useSubscribable(optionsStore).runtimeHook;
  const runtime = useRuntimeAdaptersProvider(
    adapters,
    function useBoundRuntimeAdapters() {
      return useRemoteThreadRuntimeHostProvider(runtimeHook);
    },
  );
  const threadCore = (
    runtime.thread as ThreadRuntimeImpl
  ).__internal_threadBinding.getState();
  const boundDisposals = useRef<
    { signal: AbortSignal; core: ThreadRuntimeCore }[]
  >([]);
  useEffect(() => {
    if (!destroySignal) return;
    if (
      boundDisposals.current.some(
        ({ signal, core }) => signal === destroySignal && core === threadCore,
      )
    )
      return;
    boundDisposals.current.push({ signal: destroySignal, core: threadCore });
    const dispose = () => disposeThreadRuntime(threadCore);
    if (destroySignal.aborted) dispose();
    else destroySignal.addEventListener("abort", dispose, { once: true });
  }, [destroySignal, threadCore]);

  const initPromiseRef = useRef<Promise<unknown> | undefined>(undefined);
  const hasInitializedRef = useRef(false);
  const bornNewRef = useRef(aui.threadListItem.getState().status === "new");
  const handleInitialize = useEffectEvent(() => {
    if (hasInitializedRef.current) return;
    const item = aui.threadListItem;
    if (item.getState().status !== "new" && !bornNewRef.current) return;
    hasInitializedRef.current = true;
    bornNewRef.current = false;
    const initPromise = item.initialize();
    initPromiseRef.current = initPromise;
    void initPromise.then(
      ({ remoteId }) => {
        const setGetThreadId = (threadCore as Record<string, unknown>)
          .__internal_setGetThreadId;
        if (typeof setGetThreadId === "function") {
          setGetThreadId.call(threadCore, () => remoteId);
        }
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
    const setGetInitializePromise = (threadCore as Record<string, unknown>)
      .__internal_setGetInitializePromise;
    if (typeof setGetInitializePromise === "function") {
      setGetInitializePromise.call(threadCore, getInitializePromise);
    }
  }, [threadCore]);
  useEffect(() => {
    hasInitializedRef.current = false;
    return runtime.threads.main.unstable_on("initialize", handleInitialize);
  }, [runtime]);

  return useClientResource(ThreadClient({ runtime: runtime.thread })).methods;
};

export const RemoteThreadListRuntimeThread = resource(
  useRemoteThreadListRuntimeThread,
);
