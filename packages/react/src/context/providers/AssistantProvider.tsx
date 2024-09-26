"use client";

import type { FC, PropsWithChildren } from "react";
import { useMemo } from "react";
import { AssistantContext } from "../react/AssistantContext";
import { makeAssistantToolUIsStore } from "../stores/AssistantToolUIs";
import { ThreadProvider } from "./ThreadProvider";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { create } from "zustand";

type AssistantProviderProps = {
  runtime: AssistantRuntime;
};

const useAssistantRuntimeStore = (runtime: AssistantRuntime) => {
  return useMemo(() => create(() => runtime), [runtime]);
};

const useAssistantToolUIsStore = () => {
  return useMemo(() => makeAssistantToolUIsStore(), []);
};

export const AssistantProvider: FC<
  PropsWithChildren<AssistantProviderProps>
> = ({ children, runtime }) => {
  const useAssistantRuntime = useAssistantRuntimeStore(runtime);
  const useToolUIs = useAssistantToolUIsStore();
  const context = useMemo(() => {
    return {
      useToolUIs,
      useAssistantRuntime,
      useAssistantActions: useAssistantRuntime,
    };
  }, [useAssistantRuntime, useToolUIs]);

  return (
    <AssistantContext.Provider value={context}>
      <ThreadProvider provider={runtime.thread}>{children}</ThreadProvider>
    </AssistantContext.Provider>
  );
};
