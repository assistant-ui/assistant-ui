import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  useEffectEvent,
  useSyncExternalStore,
} from "react";
import { BaseAssistantRuntimeCore } from "../../runtime/base/base-assistant-runtime-core";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";
import type { RemoteThreadListOptions } from "../../runtimes/remote-thread-list/types";
import type { AssistantRuntimeCore } from "../../runtime/interfaces/assistant-runtime-core";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
import { useAui } from "@assistant-ui/store";

type PublishedValue<T> = {
  getSnapshot: () => T;
  subscribe: (callback: () => void) => () => void;
  publish: (value: T) => void;
};

const createPublishedValue = <T>(initialValue: T): PublishedValue<T> => {
  let value = initialValue;
  const subscribers = new Set<() => void>();

  return {
    getSnapshot: () => value,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    publish: (nextValue) => {
      if (Object.is(value, nextValue)) return;
      value = nextValue;
      for (const callback of subscribers) callback();
    },
  };
};

class RemoteThreadListRuntimeCore
  extends BaseAssistantRuntimeCore
  implements AssistantRuntimeCore
{
  public readonly threads;

  constructor(options: RemoteThreadListOptions) {
    super();
    this.threads = new RemoteThreadListThreadListRuntimeCore(
      options,
      this._contextProvider,
    );
  }

  public get RenderComponent() {
    return this.threads.__internal_RenderComponent;
  }
}

const useRemoteThreadListRuntimeImpl = (
  options: RemoteThreadListOptions,
): AssistantRuntime => {
  const [runtime] = useState(() => new RemoteThreadListRuntimeCore(options));
  useEffect(() => {
    runtime.threads.__internal_setOptions(options);
    runtime.threads.__internal_load();
  }, [runtime, options]);

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};

export const useRemoteThreadListRuntime = (
  options: RemoteThreadListOptions,
): AssistantRuntime => {
  const runtimeHookStoreRef = useRef<PublishedValue<
    RemoteThreadListOptions["runtimeHook"]
  > | null>(null);
  if (runtimeHookStoreRef.current === null) {
    runtimeHookStoreRef.current = createPublishedValue(options.runtimeHook);
  }
  const runtimeHookStore = runtimeHookStoreRef.current;

  useLayoutEffect(() => {
    runtimeHookStore.publish(options.runtimeHook);
  }, [options.runtimeHook, runtimeHookStore]);

  const initialThreadIdRef = useRef(options.initialThreadId);

  const stableRuntimeHook = useCallback(
    function useStableRuntimeHook() {
      const runtimeHook = useSyncExternalStore(
        runtimeHookStore.subscribe,
        runtimeHookStore.getSnapshot,
        runtimeHookStore.getSnapshot,
      );
      return runtimeHook();
    },
    [runtimeHookStore],
  );

  const onThreadIdChange = useEffectEvent((threadId: string | undefined) => {
    options.onThreadIdChange?.(threadId);
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
