"use client";

import { FC, memo, PropsWithChildren, useEffect } from "react";
import { useAui, AuiProvider, AssistantClient } from "@assistant-ui/store";
import { AssistantRuntime } from "./runtime/AssistantRuntime";
import { AssistantRuntimeCore } from "./runtime-cores/core/AssistantRuntimeCore";
import { RuntimeAdapter } from "./RuntimeAdapter";
import { ThreadPrimitiveViewportProvider } from "../context/providers/ThreadViewportProvider";
import { DevToolsProviderApi } from "../devtools";

export namespace AssistantRuntimeProvider {
  export type Props = PropsWithChildren<{
    /**
     * The runtime to provide to the rest of your app.
     */
    runtime: AssistantRuntime;

    /**
     * The aui instance to extend. If not provided, a new aui instance will be created.
     */
    aui?: AssistantClient;
  }>;
}

const getRenderComponent = (runtime: AssistantRuntime) => {
  return (runtime as { _core?: AssistantRuntimeCore })._core?.RenderComponent;
};

export const AssistantRuntimeProviderImpl: FC<
  AssistantRuntimeProvider.Props
> = ({ children, aui: parent = null, runtime }) => {
  const aui = useAui({ threads: RuntimeAdapter(runtime) }, { parent: parent });

  useEffect(() => {
    if (
      typeof process === "undefined" ||
      process.env["NODE_ENV"] === "production"
    )
      return;
    return DevToolsProviderApi.register(aui);
  }, [aui]);

  const RenderComponent = getRenderComponent(runtime);

  return (
    <AuiProvider value={aui}>
      {RenderComponent && <RenderComponent />}

      {/* TODO temporarily allow accessing viewport state from outside the viewport */}
      {/* TODO figure out if this behavior should be deprecated, since it is quite hacky */}
      <ThreadPrimitiveViewportProvider>
        {children}
      </ThreadPrimitiveViewportProvider>
    </AuiProvider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
