import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useEffectEvent,
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

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};

export const useRemoteThreadListRuntime = (
  options: RemoteThreadListOptions,
): AssistantRuntime => {
  const [runtimeHookStore] = useState(
    () => new WritableSubscribable(options.runtimeHook),
  );
  useEffect(() => {
    runtimeHookStore.setState(options.runtimeHook);
  }, [runtimeHookStore, options.runtimeHook]);

  const initialThreadIdRef = useRef(options.initialThreadId);

  // Thread resources subscribe to the store rather than reading a ref, so a
  // hook published at commit reaches exactly the resources that use it and an
  // abandoned render publishes nothing. The store pins its server snapshot to
  // the constructor value for hydration, which tap reads on any never-mounted
  // fiber, so the live state serves as the server snapshot here.
  const stableRuntimeHook = useCallback(
    function useCommittedRuntimeHook() {
      return useSubscribable({
        subscribe: runtimeHookStore.subscribe,
        getState: runtimeHookStore.getState,
        getServerSnapshot: runtimeHookStore.getState,
      })();
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
