import type { FC, PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ThreadContextValue } from "../react/ThreadContext";
import { ThreadContext } from "../react/ThreadContext";
import { makeThreadComposerStore } from "../stores/ThreadComposer";
import { makeThreadViewportStore } from "../stores/ThreadViewport";
import { writableStore } from "../ReadonlyStore";
import { ReactThreadState, ThreadRuntime } from "../../api/ThreadRuntime";
import { create } from "zustand";
import { ThreadComposerRuntime } from "../../api";

type ThreadProviderProps = {
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

const useThreadMessagesStore = (runtime: ThreadRuntime) => {
  const [store] = useState(() => create(() => runtime.messages));

  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.messages, true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

const useThreadComposerStore = (runtime: ThreadComposerRuntime) => {
  const [store] = useState(() => makeThreadComposerStore(runtime));

  useEffect(() => {
    const updateState = () => writableStore(store).setState(runtime.getState());
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const ThreadRuntimeProvider: FC<
  PropsWithChildren<ThreadProviderProps>
> = ({ children, runtime }) => {
  const useThreadRuntime = useThreadRuntimeStore(runtime);
  const useThread = useThreadStore(runtime);
  const useThreadMessages = useThreadMessagesStore(runtime);
  const useThreadComposer = useThreadComposerStore(runtime.composer);

  const context = useMemo<ThreadContextValue>(() => {
    const useViewport = makeThreadViewportStore();

    return {
      useThread,
      useThreadRuntime,
      useThreadMessages,
      useThreadActions: useThreadRuntime,
      useComposer: useThreadComposer,
      useViewport,
    };
  }, [useThread, useThreadRuntime, useThreadMessages, useThreadComposer]);

  // subscribe to thread updates
  const Synchronizer = context.useThread(
    (t) => (t as ReactThreadState).unstable_synchronizer,
  );

  return (
    <ThreadContext.Provider value={context}>
      {Synchronizer && <Synchronizer />}
      {children}
    </ThreadContext.Provider>
  );
};
