import {
  useEffect,
  useEffectEvent,
  useInsertionEffect,
  useMemo,
  useRef,
} from "react";
import {
  resource,
  useResource,
  useResources,
  withKey,
} from "@assistant-ui/tap";
import { useAui } from "@assistant-ui/store";
import {
  createClientFacade,
  useAssistantContextProvider,
} from "@assistant-ui/store/client";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import { ThreadRuntimeImpl } from "../../../runtime/api/thread-runtime";
import type { ThreadRuntimeCore } from "../../../runtime/interfaces/thread-runtime-core";
import { disposeThreadRuntime } from "../../../runtime/utils/thread-runtime-lifecycle";
import type { ModelContextProvider } from "../../../model-context/types";
import type { RemoteThreadListOptions } from "../../../runtimes/remote-thread-list/types";
import {
  NestedSubscriptionSubject,
  ShallowMemoizeSubject,
  WritableSubscribable,
} from "../../../subscribable/subscribable";
import { ThreadClient } from "../../../store/runtime-clients/thread-runtime-client";
import { useSubscribable } from "../../../store/runtime-clients/useSubscribable";
import { useRemoteThreadRuntimeHostProvider } from "../RemoteThreadRuntimeHostContext";
import {
  useRuntimeAdapters,
  useRuntimeAdaptersProvider,
} from "../useRuntimeAdapters";

import type { ClientThreadListRuntimeCore } from "./ClientThreadListRuntimeCore";
import { EMPTY_THREAD_CORE } from "../../../runtimes/remote-thread-list/empty-thread-core";

type ThreadOptions = {
  optionsStore: WritableSubscribable<RemoteThreadListOptions>;
  modelContext: ModelContextProvider;
  clientCore?: ClientThreadListRuntimeCore | undefined;
  threadId?: string | undefined;
  startThread?: boolean | undefined;
};

const useRemoteThreadListRuntimeHook = ({
  optionsStore,
  modelContext,
}: ThreadOptions) => {
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

  return runtime.thread;
};

const RemoteThreadListRuntimeHook = resource(useRemoteThreadListRuntimeHook);

const useHostedThreadRuntime = ({
  clientCore,
  threadId,
  startThread,
}: Pick<ThreadOptions, "clientCore" | "threadId" | "startThread">) => {
  const aui = useAui();
  const manager = clientCore!.hookManager;
  const id = threadId!;
  const destroySignal = useAssistantClientDestroySignal();
  useEffect(() => {
    if (startThread) void manager.startThreadRuntime(id).catch(() => {});
    const stop = () => manager.stopThreadRuntime(id);
    destroySignal?.addEventListener("abort", stop, { once: true });
    return () => destroySignal?.removeEventListener("abort", stop);
  }, [manager, id, destroySignal, startThread]);
  return useMemo(
    () =>
      new ThreadRuntimeImpl(
        new NestedSubscriptionSubject({
          path: {
            ref: `threads[${id}]`,
            threadSelector: { type: "threadId", threadId: id },
          },
          getState: () => manager.getThreadRuntimeCore(id) ?? EMPTY_THREAD_CORE,
          subscribe: (callback) => manager.subscribe(callback),
        }),
        new ShallowMemoizeSubject({
          path: {
            ref: `threadItems[${id}]`,
            threadSelector: { type: "threadId", threadId: id },
          },
          getState: () => ({ ...aui.threadListItem.getState(), isMain: false }),
          subscribe: aui.subscribe,
        }),
      ),
    [manager, aui, id],
  );
};

const HostedThreadRuntime = resource(useHostedThreadRuntime);

const useRemoteThreadListRuntimeThread = (options: ThreadOptions) => {
  const aui = useAui();
  const auiRef = useRef(aui);
  useInsertionEffect(() => {
    auiRef.current = aui;
  }, [aui]);
  const stableAui = useMemo(
    () =>
      createClientFacade({
        getClient: () => auiRef.current,
        subscribe: (listener) => auiRef.current.subscribe(listener),
      }),
    [],
  );
  const hookElement = useMemo(
    () =>
      withKey(
        "runtime",
        options.clientCore
          ? HostedThreadRuntime({
              clientCore: options.clientCore,
              threadId: options.threadId,
              startThread: options.startThread,
            })
          : RemoteThreadListRuntimeHook(options),
      ),
    [options],
  );
  const runtime = useAssistantContextProvider(
    stableAui,
    function WithStableAssistantClient() {
      return useResources([hookElement])[0]!;
    },
  );
  return useResource(ThreadClient({ runtime }));
};

export const RemoteThreadListRuntimeThread = resource(
  useRemoteThreadListRuntimeThread,
);
