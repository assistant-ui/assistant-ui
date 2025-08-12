"use client";

import { FC, PropsWithChildren, memo } from "react";
import { AssistantContext } from "../react/AssistantContext";
import { ThreadRuntimeProvider } from "./ThreadRuntimeProvider";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { AssistantRuntimeCore } from "../../runtimes/core/AssistantRuntimeCore";
import { useAssistantClient } from "../../client/AssistantClient";
import { AssistantActionsContext } from "../react/AssistantActionsContext";

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

export const AssistantProviderImpl: FC<AssistantProvider.Props> = ({
  children,
  runtime,
}) => {
  const assistantClient = useAssistantClient(runtime);

  const RenderComponent = getRenderComponent(runtime);

  return (
    <AssistantContext.Provider value={assistantClient}>
      <AssistantActionsContext.Provider value={assistantClient.actions}>
        {RenderComponent && <RenderComponent />}
        <ThreadRuntimeProvider
          runtime={runtime.thread}
          listItemRuntime={runtime.threads.mainItem}
        >
          {children}
        </ThreadRuntimeProvider>
      </AssistantActionsContext.Provider>
    </AssistantContext.Provider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantProviderImpl);
