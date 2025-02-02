"use client";

import { useState, useEffect, useMemo } from "react";
import { BaseAssistantRuntimeCore } from "../core/BaseAssistantRuntimeCore";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
import { RemoteThreadListAdapter } from "./types";
import { AssistantRuntimeImpl } from "../../internal";
import { AssistantRuntimeCore } from "../core/AssistantRuntimeCore";

class RemoteThreadListRuntimeCore
  extends BaseAssistantRuntimeCore
  implements AssistantRuntimeCore
{
  public readonly threads;

  constructor(adapter: RemoteThreadListAdapter) {
    super();
    this.threads = new RemoteThreadListThreadListRuntimeCore(
      adapter,
      this._contextProvider,
    );
  }

  public get RenderComponent() {
    return this.threads.__internal_RenderComponent;
  }
}

export const useRemoteThreadListRuntime = (
  adapter: RemoteThreadListAdapter,
) => {
  const [runtime] = useState(() => new RemoteThreadListRuntimeCore(adapter));
  useEffect(() => {
    runtime.threads.__internal_setAdapter(adapter);
    return runtime.threads.__internal_bindAdapter();
  }, [runtime, adapter]);
  return useMemo(() => AssistantRuntimeImpl.create(runtime), [runtime]);
};
