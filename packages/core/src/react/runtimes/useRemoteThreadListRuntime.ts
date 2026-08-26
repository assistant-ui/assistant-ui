import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useEffectEvent,
} from "react";
import { create } from "zustand";
import { BaseAssistantRuntimeCore } from "../../runtime/base/base-assistant-runtime-core";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";
import type { RemoteThreadListOptions } from "../../runtimes/remote-thread-list/types";
import type { AssistantRuntimeCore } from "../../runtime/interfaces/assistant-runtime-core";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
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

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};

export const useRemoteThreadListRuntime = (
  options: RemoteThreadListOptions,
): AssistantRuntime => {
  const [useRuntimeHook] = useState(() =>
    create(() => ({ current: options.runtimeHook })),
  );
  useEffect(() => {
    useRuntimeHook.setState({ current: options.runtimeHook }, true);
  }, [useRuntimeHook, options.runtimeHook]);

  const initialThreadIdRef = useRef(options.initialThreadId);

  const stableRuntimeHook = useCallback(
    function RuntimeHook() {
      const useCurrentRuntime = useRuntimeHook((state) => state.current);
      return useCurrentRuntime();
    },
    [useRuntimeHook],
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

    return options.runtimeHook();
  }

  const runtime = useRemoteThreadListRuntimeImpl(stableOptions);

  return runtime;
};
