import { useState, useEffect, useMemo, FC, PropsWithChildren } from "react";
import { BaseAssistantRuntimeCore } from "../core/BaseAssistantRuntimeCore";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
import { RemoteThreadListAdapter } from "./types";
import { AssistantRuntimeImpl } from "../../internal";

class RemoteThreadListRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threadList;

  constructor(adapter: RemoteThreadListAdapter) {
    super();
    this.threadList = new RemoteThreadListThreadListRuntimeCore(adapter);
  }

  public __internal_RenderComponent: FC<PropsWithChildren> = ({ children }) => {
    return (
      <>
        <this.threadList.__internal_RenderThreadRuntimes />
        {children}
      </>
    );
  };
}

export const useRemoteThreadListRuntime = (
  adapter: RemoteThreadListAdapter,
) => {
  const [runtime] = useState(() => new RemoteThreadListRuntimeCore(adapter));
  useEffect(() => {
    runtime.threadList.__internal_setAdapter(adapter);
  }, [runtime, adapter]);
  return useMemo(() => AssistantRuntimeImpl.create(runtime), [runtime]);
};
