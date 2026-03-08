"use client";

import { FC, memo, PropsWithChildren, useEffect } from "react";
import { AssistantClient, useAui } from "@assistant-ui/store";
import { AssistantRuntime } from "./runtime/AssistantRuntime";
import { AssistantProviderBase } from "@assistant-ui/core/react";
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

const DevToolsRegistration: FC = () => {
  const aui = useAui();
  useEffect(() => {
    if (typeof process === "undefined" || process.env.NODE_ENV === "production")
      return;
    return DevToolsProviderApi.register(aui);
  }, [aui]);
  return null;
};

export const AssistantRuntimeProviderImpl: FC<
  AssistantRuntimeProvider.Props
> = ({ children, aui, runtime }) => {
  return (
    <AssistantProviderBase runtime={runtime} aui={aui ?? null}>
      <DevToolsRegistration />
      {/* TODO temporarily allow accessing viewport state from outside the viewport */}
      {/* TODO figure out if this behavior should be deprecated, since it is quite hacky */}
      <ThreadPrimitiveViewportProvider>
        {children}
      </ThreadPrimitiveViewportProvider>
    </AssistantProviderBase>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
