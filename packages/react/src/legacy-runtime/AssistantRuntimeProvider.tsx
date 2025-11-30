"use client";

import { FC, memo, PropsWithChildren } from "react";
import {
  useAssistantApi,
  AssistantProvider,
} from "../context/react/AssistantApiContext";
import { AssistantRuntime } from "./runtime/AssistantRuntime";
import { AssistantRuntimeCore } from "./runtime-cores/core/AssistantRuntimeCore";
import { RuntimeAdapter } from "./RuntimeAdapter";
import { ThreadPrimitiveViewportProvider } from "../context/providers/ThreadViewportProvider";

export namespace AssistantRuntimeProvider {
  export type Props = PropsWithChildren<{
    /**
     * The runtime to provide to the rest of your app.
     */
    runtime: AssistantRuntime;
  }>;
}

const getRenderComponent = (runtime: AssistantRuntime) => {
  return (runtime as { _core?: AssistantRuntimeCore })._core?.RenderComponent;
};

export const AssistantRuntimeProviderImpl: FC<
  AssistantRuntimeProvider.Props
> = ({ children, runtime }) => {
  const api = useAssistantApi({
    threads: RuntimeAdapter(runtime),
  });

  const RenderComponent = getRenderComponent(runtime);

  return (
    <AssistantProvider api={api}>
      {RenderComponent && <RenderComponent />}

      {/* TODO temporarily allow accessing viewport state from outside the viewport */}
      {/* TODO figure out if this behavior should be deprecated, since it is quite hacky */}
      <ThreadPrimitiveViewportProvider>
        {children}
      </ThreadPrimitiveViewportProvider>
    </AssistantProvider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
