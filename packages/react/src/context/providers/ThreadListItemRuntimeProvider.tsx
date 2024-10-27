"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import {
  ThreadListItemContext,
  type ThreadListItemContextValue,
} from "../react/ThreadListItemContext";
import { writableStore } from "../ReadonlyStore";
import { ThreadListItemRuntime } from "../../api/ThreadListItemRuntime";

export namespace ThreadListItemRuntimeProvider {
  export type Props = PropsWithChildren<{
    runtime: ThreadListItemRuntime;
  }>;
}

const useThreadListItemRuntimeStore = (runtime: ThreadListItemRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

export const useThreadListItemStore = (runtime: ThreadListItemRuntime) => {
  const [store] = useState(() => create(() => runtime.getState()));
  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.getState(), true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const ThreadListItemRuntimeProvider: FC<
  ThreadListItemRuntimeProvider.Props
> = ({ runtime, children }) => {
  const useThreadListItemRuntime = useThreadListItemRuntimeStore(runtime);
  const useThreadListItem = useThreadListItemStore(runtime);
  const [context] = useState<ThreadListItemContextValue>(() => {
    return { useThreadListItemRuntime, useThreadListItem };
  });

  return (
    <ThreadListItemContext.Provider value={context}>
      {children}
    </ThreadListItemContext.Provider>
  );
};
