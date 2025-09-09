"use client";

import { FC, memo, PropsWithChildren } from "react";
import { AssistantApiProvider } from "../context/react/AssistantApiContext";
import { AssistantRuntime } from "./runtime/AssistantRuntime";
import { AssistantRuntimeCore } from "./runtime-cores/core/AssistantRuntimeCore";
import { useAssistantClient } from "../client/AssistantClient";

import { ThreadViewportProvider } from "../context/providers/ThreadViewportProvider";
import { ThreadListClient } from "./client/ThreadListRuntimeClient";

export namespace AssistantProvider {
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

export const AssistantRuntimeProviderImpl: FC<AssistantProvider.Props> = ({
  children,
  runtime,
}) => {
  const api = useAssistantClient({
    threads: ThreadListClient({
      runtime: runtime.threads,
    }),
    registerModelContextProvider: runtime.registerModelContextProvider,
    __internal_runtime: runtime,
  });

  const RenderComponent = getRenderComponent(runtime);

  return (
    <AssistantProvider api={api}>
      {RenderComponent && <RenderComponent />}

      {children}
    </AssistantProvider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);

const AssistantProvider: FC<
  PropsWithChildren<{ api: ReturnType<typeof useAssistantClient> }>
> = ({ children, api }) => {
  return (
    <AssistantApiProvider api={api}>
      {/* TODO temporarily allow accessing viewport state from outside the viewport */}
      {/* TODO figure out if this behavior should be deprecated, since it is quite hacky */}
      <ThreadViewportProvider>{children}</ThreadViewportProvider>
    </AssistantApiProvider>
  );
};
