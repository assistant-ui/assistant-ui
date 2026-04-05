import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  const runtimeHookRef = useRef(options.runtimeHook);
  runtimeHookRef.current = options.runtimeHook;

  // threadId/initialThreadId only affect the constructor; capture once via ref
  const startThreadIdRef = useRef(options.threadId ?? options.initialThreadId);

  const stableRuntimeHook = useCallback(() => {
    return runtimeHookRef.current();
  }, []);

  const stableOptions = useMemo<RemoteThreadListOptions>(
    () => ({
      adapter: options.adapter,
      allowNesting: options.allowNesting,
      initialThreadId: startThreadIdRef.current,
      runtimeHook: stableRuntimeHook,
    }),
    [options.adapter, options.allowNesting, stableRuntimeHook],
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
    return stableRuntimeHook();
  }

  const runtime = useRemoteThreadListRuntimeImpl(stableOptions);

  const prevThreadIdRef = useRef(options.threadId);
  useEffect(() => {
    if (options.threadId === prevThreadIdRef.current) return;
    prevThreadIdRef.current = options.threadId;
    if (options.threadId) {
      runtime.threads.switchToThread(options.threadId).catch(() => {});
    } else {
      runtime.threads.switchToNewThread().catch(() => {});
    }
  }, [runtime, options.threadId]);

  return runtime;
};
