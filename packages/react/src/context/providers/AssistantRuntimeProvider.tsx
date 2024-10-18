"use client";

import type { FC, PropsWithChildren } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { AssistantContext } from "../react/AssistantContext";
import { makeAssistantToolUIsStore } from "../stores/AssistantToolUIs";
import { ThreadRuntimeProvider } from "./ThreadRuntimeProvider";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { create } from "zustand";
import { writableStore } from "../ReadonlyStore";

type AssistantRuntimeProviderProps = {
  runtime: AssistantRuntime;
};

const useAssistantRuntimeStore = (runtime: AssistantRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

const useAssistantToolUIsStore = () => {
  return useMemo(() => makeAssistantToolUIsStore(), []);
};

const useThreadManagerStore = (runtime: AssistantRuntime) => {
  const [store] = useState(() =>
    create(() => runtime.threadManager.getState()),
  );

  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.threadManager.getState(), true);
    updateState();
    return runtime.threadManager.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const AssistantRuntimeProviderImpl: FC<
  PropsWithChildren<AssistantRuntimeProviderProps>
> = ({ children, runtime }) => {
  const useAssistantRuntime = useAssistantRuntimeStore(runtime);
  const useToolUIs = useAssistantToolUIsStore();
  const useThreadManager = useThreadManagerStore(runtime);
  const context = useMemo(() => {
    return {
      useToolUIs,
      useAssistantRuntime,
      useAssistantActions: useAssistantRuntime,
      useThreadManager,
    };
  }, [useAssistantRuntime, useToolUIs, useThreadManager]);

  return (
    <AssistantContext.Provider value={context}>
      <ThreadRuntimeProvider runtime={runtime.thread}>
        {children}
      </ThreadRuntimeProvider>
    </AssistantContext.Provider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
