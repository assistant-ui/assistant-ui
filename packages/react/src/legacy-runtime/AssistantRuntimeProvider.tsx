"use client";

import { FC, memo, PropsWithChildren } from "react";
import {
  AssistantProvider,
  useAssistantApi,
} from "../context/react/AssistantApiContext";
import { AssistantRuntime } from "./runtime/AssistantRuntime";
import { AssistantRuntimeCore } from "./runtime-cores/core/AssistantRuntimeCore";
import { RuntimeAdapter } from "./RuntimeAdapter";

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
  const api = useAssistantApi({
    threads: RuntimeAdapter(runtime),
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
