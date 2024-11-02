"use client";

import type { FC, PropsWithChildren } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { AssistantContext } from "../react/AssistantContext";
import { makeAssistantToolUIsStore } from "../stores/AssistantToolUIs";
import { ThreadRuntimeProvider } from "./ThreadRuntimeProvider";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { create } from "zustand";
import { writableStore } from "../ReadonlyStore";

export namespace AssistantRuntimeProvider {
  export type Props = PropsWithChildren<{
    /**
     * The runtime to provide to the rest of your app.
     */
    runtime: AssistantRuntime;
  }>;
}

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

const useThreadListStore = (runtime: AssistantRuntime) => {
  const [store] = useState(() => create(() => runtime.threadList.getState()));

  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.threadList.getState(), true);
    updateState();
    return runtime.threadList.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const AssistantRuntimeProviderImpl: FC<
  AssistantRuntimeProvider.Props
> = ({ children, runtime }) => {
  const useAssistantRuntime = useAssistantRuntimeStore(runtime);
  const useToolUIs = useAssistantToolUIsStore();
  const useThreadList = useThreadListStore(runtime);
  const context = useMemo(() => {
    return {
      useToolUIs,
      useAssistantRuntime,
      useThreadList,
    };
  }, [useAssistantRuntime, useToolUIs, useThreadList]);

  return (
    <AssistantContext.Provider value={context}>
      <ThreadRuntimeProvider runtime={runtime.thread}>
        {children}
      </ThreadRuntimeProvider>
    </AssistantContext.Provider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
