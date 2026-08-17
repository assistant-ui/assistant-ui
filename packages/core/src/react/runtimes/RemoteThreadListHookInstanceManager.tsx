import {
  type FC,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  memo,
  type PropsWithChildren,
  type ComponentType,
  Fragment,
} from "react";
import { create } from "zustand";
import { useResources, withKey } from "@assistant-ui/tap";
import type { AssistantClient } from "@assistant-ui/store";
import { ThreadListItemRuntimeProvider } from "../providers/ThreadListItemRuntimeProvider";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import type { Unsubscribe } from "../../types/unsubscribe";
import { BaseSubscribable } from "../../subscribable/subscribable";
import { getThreadRuntimeCoreIsRunning } from "../../runtime/api/thread-runtime";
import { ThreadListRuntimeImpl } from "../../runtime/api/thread-list-runtime";
import { invalidateThreadRuntime } from "../../runtime/utils/thread-runtime-lifecycle";
import {
  useRuntimeAdapters,
  type RuntimeAdapters,
} from "./RuntimeAdapterProvider";
import {
  RemoteThreadResource,
  type RemoteThreadListHook,
} from "./RemoteThreadResource";

type RemoteThreadListHookInstance = {
  runtime?: ThreadRuntimeCore | undefined;
  publishedGeneration?: number | undefined;
  generation: number;
  isRunning: boolean;
  unsubscribeRunning?: Unsubscribe | undefined;
};

type AdapterSnapshot = {
  defaultAdapters: RuntimeAdapters | null;
  threadAdapters: ReadonlyMap<string, RuntimeAdapters | null>;
};

type HostSnapshot = {
  threads: readonly { id: string; generation: number }[];
  hookEpoch: number;
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
  private runtimeHook: RemoteThreadListHook;
  private readonly adapterStore = create<AdapterSnapshot>(() => ({
    defaultAdapters: null,
    threadAdapters: new Map(),
  }));
  private readonly hostStore = create<HostSnapshot>(() => ({
    threads: [],
    hookEpoch: 0,
  }));
  private readonly pendingThreadAdapters = new Map<
    string,
    RuntimeAdapters | null
  >();
  private instances = new Map<string, RemoteThreadListHookInstance>();
  private nextGeneration = 0;
  private parent: ThreadListRuntimeCore;

  constructor(
    runtimeHook: RemoteThreadListHook,
    parent: ThreadListRuntimeCore,
  ) {
    super();
    this.parent = parent;
    this.runtimeHook = runtimeHook;
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
          return;
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
      const generation = this.nextGeneration++;
      this.instances.set(threadId, {
        generation,
        isRunning: false,
      });
      this._syncHostThreads();
    }

    return this._whenRuntimeAttached(threadId);
  }

  public __internal_restartThreadRuntime(threadId: string) {
    const instance = this.instances.get(threadId);
    if (!instance) return this.startThreadRuntime(threadId);

    if (instance.runtime) invalidateThreadRuntime(instance.runtime);
    instance.generation = this.nextGeneration++;
    this._syncHostThreads();
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

  public __internal_subscribeRunningChanged(callback: () => void): Unsubscribe {
    this.runningSubscribers.add(callback);
    return () => this.runningSubscribers.delete(callback);
  }

  private _publish = (
    threadId: string,
    runtime: ThreadRuntimeCore,
    generation: number,
  ) => {
    this._publishThreadRuntime(threadId, runtime, generation);
  };

  private _publishThreadRuntime(
    threadId: string,
    runtime: ThreadRuntimeCore,
    generation: number,
  ) {
    const instance = this.instances.get(threadId);
    if (!instance) return;

    if (instance.generation !== generation) return;

    const previousRuntime = instance.runtime;
    instance.runtime = runtime;
    instance.publishedGeneration = generation;
    if (previousRuntime !== runtime) {
      this._trackRunning(instance);
    }
    this._notifySubscribers();
  }

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
    const instance = this.instances.get(threadId);
    if (instance?.runtime) invalidateThreadRuntime(instance.runtime);
    instance?.unsubscribeRunning?.();
    this.instances.delete(threadId);
    this.pendingThreadAdapters.delete(threadId);
    this._syncHostThreads();
    this._notifySubscribers();
  }

  public setRuntimeHook(newRuntimeHook: RemoteThreadListHook) {
    if (this.runtimeHook === newRuntimeHook) return;
    this.runtimeHook = newRuntimeHook;
    this.hostStore.setState(
      (state) => ({ ...state, hookEpoch: state.hookEpoch + 1 }),
      true,
    );
  }

  public __internal_setDefaultAdapters(adapters: RuntimeAdapters | null) {
    const current = this.adapterStore.getState();
    if (current.defaultAdapters === adapters) return;
    this.adapterStore.setState({ ...current, defaultAdapters: adapters }, true);
  }

  public __internal_setThreadAdapters(
    threadId: string,
    adapters: RuntimeAdapters | null,
  ) {
    const current = this.adapterStore.getState();
    const next = new Map(current.threadAdapters);
    if (adapters === null) next.delete(threadId);
    else next.set(threadId, adapters);
    this.adapterStore.setState({ ...current, threadAdapters: next }, true);
  }

  public __internal_dispose() {
    for (const threadId of [...this.instances.keys()]) {
      this.stopThreadRuntime(threadId);
    }
  }

  private _syncHostThreads() {
    this.hostStore.setState(
      (state) => ({
        ...state,
        threads: Array.from(this.instances.entries()).map(
          ([id, { generation }]) => ({ id, generation }),
        ),
      }),
      true,
    );
  }

  public __internal_useHost(parentClient: AssistantClient) {
    const { threads, hookEpoch } = this.hostStore();
    const adapters = this.adapterStore();
    const runtimeHook = this.runtimeHook;
    return useResources(
      threads.map(({ id, generation }) => {
        const threadAdapters = this.pendingThreadAdapters.has(id)
          ? this.pendingThreadAdapters.get(id)!
          : (adapters.threadAdapters.get(id) ?? adapters.defaultAdapters);
        return withKey(
          `${id}:${generation}:${hookEpoch}`,
          RemoteThreadResource({
            threadId: id,
            generation,
            parentList: this.parent,
            runtimeHook,
            parentClient,
            adapters: threadAdapters,
            publish: this._publish,
          }),
        );
      }),
    );
  }

  public __internal_RenderThreadRuntimes: FC<{
    provider: ComponentType<PropsWithChildren>;
  }> = ({ provider }) => {
    this.hostStore();

    return Array.from(this.instances.entries()).map(
      ([threadId, { generation }]) => (
        <this._OuterActiveThreadProvider
          key={`${threadId}:${generation}`}
          threadId={threadId}
          provider={provider}
        />
      ),
    );
  };

  public __internal_Host: FC<{ parentClient: AssistantClient }> = ({
    parentClient,
  }) => {
    this.__internal_useHost(parentClient);
    return null;
  };

  private _OuterActiveThreadProvider: FC<{
    threadId: string;
    provider: ComponentType<PropsWithChildren>;
  }> = memo(({ threadId, provider: Provider }) => {
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
                "or `useEffect` gate strands the runtime host and leaves the thread without context.",
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
          <this._AdapterSink threadId={threadId} detectorRef={detectorRef} />
        </Provider>
      </ThreadListItemRuntimeProvider>
    );
  });

  private _AdapterSink: FC<{
    threadId: string;
    detectorRef: RefObject<boolean>;
  }> = ({ threadId, detectorRef }) => {
    const adapters = useRuntimeAdapters();
    this.pendingThreadAdapters.set(threadId, adapters);
    useLayoutEffect(() => {
      this.__internal_setThreadAdapters(threadId, adapters);
      return () => {
        if (this.pendingThreadAdapters.get(threadId) === adapters) {
          this.pendingThreadAdapters.delete(threadId);
        }
        this.__internal_setThreadAdapters(threadId, null);
      };
    }, [threadId, adapters]);
    return <ProviderRenderDetector detectorRef={detectorRef} />;
  };
}
