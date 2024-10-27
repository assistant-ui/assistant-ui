"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import {
  ThreadManagerItemContext,
  type ThreadManagerItemContextValue,
} from "../react/ThreadManagerItemContext";
import { writableStore } from "../ReadonlyStore";
import { ThreadManagerItemRuntime } from "../../api/ThreadManagerItemRuntime";

export namespace ThreadManagerItemRuntimeProvider {
  export type Props = PropsWithChildren<{
    runtime: ThreadManagerItemRuntime;
  }>;
}

const useThreadManagerItemRuntimeStore = (
  runtime: ThreadManagerItemRuntime,
) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

export const useThreadManagerItemStore = (
  runtime: ThreadManagerItemRuntime,
) => {
  const [store] = useState(() => create(() => runtime.getState()));
  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.getState(), true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const ThreadManagerItemRuntimeProvider: FC<
  ThreadManagerItemRuntimeProvider.Props
> = ({ runtime, children }) => {
  const useThreadManagerItemRuntime = useThreadManagerItemRuntimeStore(runtime);
  const useThreadManagerItem = useThreadManagerItemStore(runtime);
  const [context] = useState<ThreadManagerItemContextValue>(() => {
    return { useThreadManagerItemRuntime, useThreadManagerItem };
  });

  return (
    <ThreadManagerItemContext.Provider value={context}>
      {children}
    </ThreadManagerItemContext.Provider>
  );
};
