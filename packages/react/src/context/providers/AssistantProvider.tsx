"use client";

import type { FC, PropsWithChildren } from "react";
import { useEffect, useInsertionEffect, useRef, useState } from "react";
import type { AssistantRuntime } from "../../runtimes";
import { AssistantContext } from "../react/AssistantContext";
import { makeAssistantToolUIsStore } from "../stores/AssistantToolUIs";
import { ThreadProvider } from "./ThreadProvider";
import { makeAssistantActionsStore } from "../stores/AssistantActions";
import { makeAssistantRuntimeStore } from "../stores/AssistantRuntime";
import { writableStore } from "../ReadonlyStore";

type AssistantProviderProps = {
  runtime: AssistantRuntime;
};

export const AssistantProvider: FC<
  PropsWithChildren<AssistantProviderProps>
> = ({ children, runtime }) => {
  const runtimeRef = useRef(runtime);
  useInsertionEffect(() => {
    runtimeRef.current = runtime;
  });

  const [context] = useState(() => {
    const useAssistantRuntime = makeAssistantRuntimeStore(runtime);
    const useToolUIs = makeAssistantToolUIsStore();
    const useAssistantActions = makeAssistantActionsStore(runtimeRef);

    return {
      useToolUIs,
      useAssistantRuntime,
      useAssistantActions,
    };
  });

  useEffect(
    () => writableStore(context.useAssistantRuntime).setState(runtime, true),
    [runtime, context],
  );

  return (
    <AssistantContext.Provider value={context}>
      <ThreadProvider provider={runtime}>{children}</ThreadProvider>
    </AssistantContext.Provider>
  );
};
