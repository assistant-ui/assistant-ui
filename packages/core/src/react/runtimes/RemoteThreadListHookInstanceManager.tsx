import {
  type FC,
  type RefObject,
  useCallback,
  useRef,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  memo,
  type PropsWithChildren,
  type ComponentType,
  useMemo,
  Fragment,
} from "react";
import { type UseBoundStore, type StoreApi, create } from "zustand";
import { useAui } from "@assistant-ui/store";
import { ThreadListItemRuntimeProvider } from "../providers/ThreadListItemRuntimeProvider";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { Unsubscribe } from "../../types/unsubscribe";
import { BaseSubscribable } from "../../subscribable/subscribable";
import {
  getThreadRuntimeCoreIsRunning,
  type ThreadRuntimeImpl,
} from "../../runtime/api/thread-runtime";
import { ThreadListRuntimeImpl } from "../../runtime/api/thread-list-runtime";

type RemoteThreadListHook = () => AssistantRuntime;

type RemoteThreadListHookInstance = {
  runtime?: ThreadRuntimeCore | undefined;
  // A runtime riding across a restart stays readable, but only counts as
  // attached once a binder of the current generation re-publishes it.
  publishedGeneration?: number | undefined;
  // Part of the binder's React key, so only a bump remounts the hook.
  generation: number;
  isRunning: boolean;
  unsubscribeRunning?: Unsubscribe | undefined;
};

const ProviderRenderDetector: FC<{
  detectorRef: RefObject<boolean>;
}> = ({ detectorRef }) => {
  useLayoutEffect(() => {
    detectorRef.current = true;
  }, [detectorRef]);
  return null;
};
export class RemoteThreadListHookInstanceManager extends BaseSubscribable {
  private useRuntimeHook: UseBoundStore<
    StoreApi<{ useRuntime: RemoteThreadListHook }>
  >;
  private instances = new Map<string, RemoteThreadListHookInstance>();
  // Manager-wide so it survives instance deletion: a stop and start within one
  // React commit must not reuse a binder key.
  private nextGeneration = 0;
  private useAliveThreadsKeysChanged = create(() => ({}));
  private parent: ThreadListRuntimeCore;

  constructor(
    runtimeHook: RemoteThreadListHook,
    parent: ThreadListRuntimeCore,
  ) {
    super();
    this.parent = parent;
    this.useRuntimeHook = create(() => ({ useRuntime: runtimeHook }));
  }

  private _whenRuntimeAttached(threadId: string) {
    return new Promise<ThreadRuntimeCore>((resolve, reject) => {
      const callback = () => {
        const instance = this.instances.get(threadId);
        if (!instance) {
          dispose();
          reject(new Error("Thread was deleted before runtime was started"));
        } else if (
          !instance.runtime ||
          instance.publishedGeneration !== instance.generation
        ) {
          return; // not yet published by the current generation's binder
        } else {
          dispose();
          resolve(instance.runtime);
        }
      };
      const dispose = this.subscribe(callback);
      callback();
    });
  }

  public startThreadRuntime(threadId: string) {
    if (!this.instances.has(threadId)) {
      this.instances.set(threadId, {
        generation: this.nextGeneration++,
        isRunning: false,
      });
      this.useAliveThreadsKeysChanged.setState({}, true);
    }

    return this._whenRuntimeAttached(threadId);
  }

  public __internal_restartThreadRuntime(threadId: string) {
    const instance = this.instances.get(threadId);
    if (!instance) return this.startThreadRuntime(threadId);

    instance.generation = this.nextGeneration++;
    this.useAliveThreadsKeysChanged.setState({}, true);
    this._notifySubscribers();

    return this._whenRuntimeAttached(threadId);
  }

  public getThreadRuntimeCore(threadId: string) {
    const instance = this.instances.get(threadId);
    if (!instance) return undefined;
    return instance.runtime;
  }

  public __internal_isThreadRunning(threadId: string) {
    return this.instances.get(threadId)?.isRunning ?? false;
  }

  private runningSubscribers = new Set<() => void>();

  /**
   * Fires when any thread crosses the running boundary. Separate from the
   * general subscription so a run does not push the thread list through the
   * channel that resolves pending runtime attachments.
   */
  public __internal_subscribeRunningChanged(callback: () => void): Unsubscribe {
    this.runningSubscribers.add(callback);
    return () => this.runningSubscribers.delete(callback);
  }

  private _publishThreadRuntime(
    threadId: string,
    runtime: ThreadRuntimeCore,
    generation: number,
  ) {
    const instance = this.instances.get(threadId);
    if (!instance)
      throw new Error(
        `Thread "${threadId}" runtime binding not found. This is a bug in assistant-ui.`,
      );

    // An outgoing binder outlives its generation until React commits the key
    // change, and must not publish over the incoming one.
    if (instance.generation !== generation) return;

    const previousRuntime = instance.runtime;
    instance.runtime = runtime;
    instance.publishedGeneration = generation;
    if (previousRuntime !== runtime) {
      this._trackRunning(instance);
    }
    this._notifySubscribers();
  }

  // Run state changes far more often than the thread list does, so the list is
  // only notified when a thread crosses the running boundary.
  private _trackRunning(instance: RemoteThreadListHookInstance) {
    instance.unsubscribeRunning?.();

    const runtime = instance.runtime;
    if (!runtime) {
      instance.unsubscribeRunning = undefined;
      this._setRunning(instance, false);
      return;
    }

    this._setRunning(instance, getThreadRuntimeCoreIsRunning(runtime));
    instance.unsubscribeRunning = runtime.subscribe(() => {
      this._setRunning(instance, getThreadRuntimeCoreIsRunning(runtime));
    });
  }

  private _setRunning(
    instance: RemoteThreadListHookInstance,
    isRunning: boolean,
  ) {
    if (instance.isRunning === isRunning) return;
    instance.isRunning = isRunning;
    for (const callback of this.runningSubscribers) callback();
  }

  public stopThreadRuntime(threadId: string) {
    this.instances.get(threadId)?.unsubscribeRunning?.();
    this.instances.delete(threadId);
    this.useAliveThreadsKeysChanged.setState({}, true);
    this._notifySubscribers();
  }

  public setRuntimeHook(newRuntimeHook: RemoteThreadListHook) {
    const prevRuntimeHook = this.useRuntimeHook.getState().useRuntime;
    if (prevRuntimeHook !== newRuntimeHook) {
      this.useRuntimeHook.setState({ useRuntime: newRuntimeHook }, true);
    }
  }

  // Rendered as a child of the user's Provider so the runtime hook can
  // read context the Provider injects (e.g. RuntimeAdapterProvider).
  private _RuntimeBinder: FC<
    PropsWithChildren<{ threadId: string; generation: number }>
  > = ({ threadId, generation, children }) => {
    const { useRuntime } = this.useRuntimeHook();
    const runtime = useRuntime();

    const threadBinding = (runtime.thread as ThreadRuntimeImpl)
      .__internal_threadBinding;

    const updateRuntime = useCallback(() => {
      this._publishThreadRuntime(
        threadId,
        threadBinding.getState(),
        generation,
      );
    }, [threadId, generation, threadBinding]);

    const isMounted = useRef(false);
    if (!isMounted.current) {
      updateRuntime();
    }

    useEffect(() => {
      isMounted.current = true;
      updateRuntime();
      return threadBinding.outerSubscribe(updateRuntime);
    }, [threadBinding, updateRuntime]);

    const aui = useAui();
    const initPromiseRef = useRef<Promise<unknown> | undefined>(undefined);
    const hasInitializedRef = useRef(false);

    useEffect(() => {
      const runtimeCore = threadBinding.getState();
      const setGetInitializePromise = (runtimeCore as Record<string, unknown>)
        .__internal_setGetInitializePromise;
      if (typeof setGetInitializePromise === "function") {
        setGetInitializePromise.call(runtimeCore, () => initPromiseRef.current);
      }
    }, [threadBinding]);

    const handleInitialize = useEffectEvent(() => {
      if (hasInitializedRef.current) return;

      const state = aui.threadListItem.getState();
      if (state.status !== "new") return;
      hasInitializedRef.current = true;

      initPromiseRef.current = aui.threadListItem.initialize();

      const dispose = runtime.thread.unstable_on("runEnd", () => {
        dispose();
        aui.threadListItem.generateTitle();
      });
    });

    useEffect(() => {
      hasInitializedRef.current = false;
      return runtime.threads.main.unstable_on("initialize", handleInitialize);
    }, [runtime]);

    return <>{children}</>;
  };

  private _OuterActiveThreadProvider: FC<{
    threadId: string;
    generation: number;
    provider: ComponentType<PropsWithChildren>;
  }> = memo(({ threadId, generation, provider: Provider }) => {
    const runtime = useMemo(
      () => new ThreadListRuntimeImpl(this.parent).getItemById(threadId),
      [threadId],
    );

    const detectorRef = useRef(false);
    useEffect(() => {
      if (process.env.NODE_ENV !== "production" && Provider !== Fragment) {
        const id = setTimeout(() => {
          if (!detectorRef.current) {
            console.warn(
              "RemoteThreadListAdapter.unstable_Provider did not render its `children` synchronously. " +
                "Render `children` on first commit; deferring them behind a loading state, Suspense boundary, " +
                "or `useEffect` gate strands the runtime binder and leaves the thread without context.",
            );
          }
        }, 100);
        return () => clearTimeout(id);
      }
      return undefined;
    }, [Provider]);

    return (
      <ThreadListItemRuntimeProvider runtime={runtime}>
        <Provider>
          <this._RuntimeBinder threadId={threadId} generation={generation}>
            <ProviderRenderDetector detectorRef={detectorRef} />
          </this._RuntimeBinder>
        </Provider>
      </ThreadListItemRuntimeProvider>
    );
  });

  public __internal_RenderThreadRuntimes: FC<{
    provider: ComponentType<PropsWithChildren>;
  }> = ({ provider }) => {
    this.useAliveThreadsKeysChanged(); // trigger re-render on alive threads change

    return Array.from(this.instances.entries()).map(
      ([threadId, { generation }]) => (
        <this._OuterActiveThreadProvider
          key={`${threadId}:${generation}`}
          threadId={threadId}
          generation={generation}
          provider={provider}
        />
      ),
    );
  };
}
