"use client";

import { useState, useEffect, useMemo } from "react";
import { BaseAssistantRuntimeCore } from "../core/BaseAssistantRuntimeCore";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
import { RemoteThreadListOptions } from "./types";
import { AssistantRuntimeImpl } from "../../internal";
import { AssistantRuntimeCore } from "../core/AssistantRuntimeCore";
import { AssistantRuntime } from "../../api/AssistantRuntime.js";

class RemoteThreadListRuntimeCore<T extends AssistantRuntime>
  extends BaseAssistantRuntimeCore
  implements AssistantRuntimeCore
{
  public readonly threads;

  constructor(options: RemoteThreadListOptions<T>) {
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

export const useRemoteThreadListRuntime = <T extends AssistantRuntime>(
  options: RemoteThreadListOptions<T>,
): T => {
  const [runtime] = useState(() => new RemoteThreadListRuntimeCore(options));
  useEffect(() => {
    runtime.threads.__internal_setOptions(options);
    runtime.threads.__internal_load();
  }, [runtime, options]);
  return useMemo(() => AssistantRuntimeImpl.create(runtime) as T, [runtime]);
};
