"use client";

import { useState, useEffect, useMemo } from "react";
import { BaseAssistantRuntimeCore } from "../core/BaseAssistantRuntimeCore";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
import { RemoteThreadListOptions } from "./types";
import { AssistantRuntimeImpl } from "../../../internal";
import { AssistantRuntimeCore } from "../core/AssistantRuntimeCore";
import { AssistantRuntime } from "../../runtime/AssistantRuntime";
import { useAssistantApiImpl } from "../../../context/react/AssistantApiContext";

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
  const api = useAssistantApiImpl();
  const isNested = api.threadListItem.source !== null;

  if (isNested) {
    if (!options.allowNesting) {
      throw new Error(
        "useRemoteThreadListRuntime cannot be nested inside another RemoteThreadListRuntime. " +
          "Set allowNesting: true to allow nesting (the inner runtime will become a no-op).",
      );
    }

    // If allowNesting is true and already inside a thread list context,
    // just call the runtimeHook directly (no-op behavior)
    return options.runtimeHook();
  }

  return useRemoteThreadListRuntimeImpl(options);
};
