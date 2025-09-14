"use client";

import { FC, memo, PropsWithChildren } from "react";
import { AssistantProvider } from "../context/react/AssistantApiContext";
import { AssistantRuntime } from "./runtime/AssistantRuntime";
import { AssistantRuntimeCore } from "./runtime-cores/core/AssistantRuntimeCore";
import { useAssistantClient } from "../client/AssistantClient";
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
