"use client";

import type { FC, PropsWithChildren } from "react";
import { useEffect, useInsertionEffect, useRef, useState } from "react";
import { AssistantContext } from "../react/AssistantContext";
import { makeAssistantToolUIsStore } from "../stores/AssistantToolUIs";
import { ThreadProvider } from "./ThreadProvider";
import { writableStore } from "../ReadonlyStore";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { create } from "zustand";

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
    const useAssistantRuntime = create(() => runtime);
    const useToolUIs = makeAssistantToolUIsStore();

    return {
      useToolUIs,
      useAssistantRuntime,
      useAssistantActions: useAssistantRuntime,
    };
  });

  useEffect(
    () => writableStore(context.useAssistantRuntime).setState(runtime, true),
    [runtime, context],
  );

  return (
    <AssistantContext.Provider value={context}>
      <ThreadProvider provider={runtime.thread}>{children}</ThreadProvider>
    </AssistantContext.Provider>
  );
};
