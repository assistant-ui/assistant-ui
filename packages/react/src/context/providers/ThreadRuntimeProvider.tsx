"use client";

import type { FC, PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ThreadContextValue } from "../react/ThreadContext";
import { ThreadContext } from "../react/ThreadContext";
import { makeThreadViewportStore } from "../stores/ThreadViewport";
import { writableStore } from "../ReadonlyStore";
import { ThreadRuntime } from "../../api/ThreadRuntime";
import { create } from "zustand";
import { ThreadComposerRuntime } from "../../api/ComposerRuntime";
import { ThreadListItemRuntime } from "../../api/ThreadListItemRuntime";
import { ThreadListItemRuntimeProvider } from "./ThreadListItemRuntimeProvider";

type ThreadProviderProps = {
  listItemRuntime: ThreadListItemRuntime;
  runtime: ThreadRuntime;
};

const useThreadRuntimeStore = (runtime: ThreadRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

const useThreadStore = (runtime: ThreadRuntime) => {
  const [store] = useState(() => create(() => runtime.getState()));
  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.getState(), true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

const useThreadComposerStore = (runtime: ThreadComposerRuntime) => {
  const [store] = useState(() => create(() => runtime.getState()));

  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.getState(), true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const ThreadRuntimeProvider: FC<
  PropsWithChildren<ThreadProviderProps>
> = ({ children, listItemRuntime: threadListItemRuntime, runtime }) => {
  const useThreadRuntime = useThreadRuntimeStore(runtime);
  const useThread = useThreadStore(runtime);
  const useThreadComposer = useThreadComposerStore(runtime.composer);

  const context = useMemo<ThreadContextValue>(() => {
    const useViewport = makeThreadViewportStore();

    return {
      useThread,
      useThreadRuntime,
      useComposer: useThreadComposer,
      useViewport,
    };
  }, [useThread, useThreadRuntime, useThreadComposer]);

  return (
    <ThreadListItemRuntimeProvider runtime={threadListItemRuntime}>
      <ThreadContext.Provider value={context}>
        {children}
      </ThreadContext.Provider>
    </ThreadListItemRuntimeProvider>
  );
};
