import {
  useState,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useEffectEvent,
  useId,
  useSyncExternalStore,
} from "react";
import { BaseAssistantRuntimeCore } from "../../runtime/base/base-assistant-runtime-core";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";
import type { RemoteThreadListOptions } from "../../runtimes/remote-thread-list/types";
import type { AssistantRuntimeCore } from "../../runtime/interfaces/assistant-runtime-core";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
import { WritableSubscribable } from "../../subscribable/subscribable";
import { useSubscribable } from "../../store/runtime-clients/useSubscribable";
import { useAui } from "@assistant-ui/store";

class RemoteThreadListRuntimeCore
  extends BaseAssistantRuntimeCore
  implements AssistantRuntimeCore
{
  public readonly threads;

  constructor(
    options: RemoteThreadListOptions,
    initialThreadIdSeed: string | undefined,
  ) {
    super();
    this.threads = new RemoteThreadListThreadListRuntimeCore(
      options,
      this._contextProvider,
      initialThreadIdSeed,
    );
  }

  public get RenderComponent() {
    return this.threads.__internal_RenderComponent;
  }
}

const subscribeNever = () => () => {};

const useRemoteThreadListRuntimeImpl = (
  options: RemoteThreadListOptions,
): AssistantRuntime => {
  // A server render must not read Math.random, and its runtime never reaches an adapter, so it names the first thread from useId; the client keeps a random id because adapters store it.
  const serverThreadIdSeed = useId();
  const isServerRender = useSyncExternalStore(
    subscribeNever,
    () => false,
    () => typeof document === "undefined",
  );
  const [runtime] = useState(
    () =>
      new RemoteThreadListRuntimeCore(
        options,
        isServerRender ? serverThreadIdSeed : undefined,
      ),
  );
  const [lifetime] = useState(() => ({ generation: 0 }));

  // Insertion-effect cleanup runs when React deletes the fiber, so a hidden <Activity> or a re-suspended boundary keeps the threads alive. Fast Refresh re-runs the effect of an edited host, cleanup then setup in the same commit, so a setup cancels the disposal its preceding cleanup queued. The disposal is deferred to a microtask because it notifies subscribers and React forbids scheduling updates from an insertion effect.
  useInsertionEffect(() => {
    const generation = ++lifetime.generation;
    return () =>
      queueMicrotask(() => {
        if (lifetime.generation === generation)
          runtime.threads.__internal_dispose();
      });
  }, [runtime, lifetime]);

  useEffect(() => {
    runtime.threads.__internal_setOptions(options);
    runtime.threads.__internal_load();
  }, [runtime, options]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const reloadAfterError = () => {
      if (runtime.threads.loadError !== undefined) {
        void runtime.threads.reload();
      }
    };
    const reloadAfterVisible = () => {
      if (document.visibilityState === "visible") reloadAfterError();
    };

    window.addEventListener("online", reloadAfterError);
    document.addEventListener("visibilitychange", reloadAfterVisible);
    return () => {
      window.removeEventListener("online", reloadAfterError);
      document.removeEventListener("visibilitychange", reloadAfterVisible);
    };
  }, [runtime]);

  const [assistantRuntime] = useState(() => new AssistantRuntimeImpl(runtime));
  return assistantRuntime;
};

export const useRemoteThreadListRuntime = (
  options: RemoteThreadListOptions,
): AssistantRuntime => {
  const [runtimeHookStore] = useState(
    () => new WritableSubscribable(options.runtimeHook),
  );
  // The layout phase re-renders hosted threads before this commit yields. An
  // insertion effect cannot notify subscribers, so descendant layout effects
  // of the same commit still see the previous hook.
  useLayoutEffect(() => {
    runtimeHookStore.setState(options.runtimeHook);
  }, [runtimeHookStore, options.runtimeHook]);

  const initialThreadIdRef = useRef(options.initialThreadId);

  // Thread resources subscribe to the store rather than reading a ref, so a
  // hook published at commit reaches exactly the resources that use it and an
  // abandoned render publishes nothing. The store pins its server snapshot to
  // the constructor value for hydration, which tap reads on any never-mounted
  // fiber, so the live state serves as the server snapshot here.
  // The delegate lives in state because Fast Refresh recomputes memoized values, and a new delegate remounts every thread resource.
  const [stableRuntimeHook] = useState(
    () =>
      function useCommittedRuntimeHook() {
        return useSubscribable({
          subscribe: runtimeHookStore.subscribe,
          getState: runtimeHookStore.getState,
          getServerSnapshot: runtimeHookStore.getState,
        })();
      },
  );

  const onThreadIdChange = useEffectEvent((threadId: string | undefined) => {
    return options.onThreadIdChange?.(threadId);
  });

  const stableOptions = useMemo<RemoteThreadListOptions>(
    () => ({
      adapter: options.adapter,
      allowNesting: options.allowNesting,
      threadId: options.threadId,
      initialThreadId: initialThreadIdRef.current,
      runtimeHook: stableRuntimeHook,
      onThreadIdChange,
    }),
    [
      options.adapter,
      options.allowNesting,
      options.threadId,
      stableRuntimeHook,
    ],
  );

  const aui = useAui();
  const isNested = aui.threadListItem.source !== null;

  if (isNested) {
    if (!stableOptions.allowNesting) {
      throw new Error(
        "useRemoteThreadListRuntime cannot be nested inside another RemoteThreadListRuntime. " +
          "Set allowNesting: true to allow nesting (the inner runtime will become a no-op).",
      );
    }

    // If allowNesting is true and already inside a thread list context,
    // just call the runtimeHook directly (no-op behavior)
    return options.runtimeHook();
  }

  const runtime = useRemoteThreadListRuntimeImpl(stableOptions);

  return runtime;
};
