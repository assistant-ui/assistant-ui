import type { FC, PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ThreadContextValue } from "../react/ThreadContext";
import { ThreadContext } from "../react/ThreadContext";
import { makeThreadComposerStore } from "../stores/ThreadComposer";
import { makeThreadViewportStore } from "../stores/ThreadViewport";
import { writableStore } from "../ReadonlyStore";
import { ReactThreadState, ThreadRuntime } from "../../api/ThreadRuntime";
import { create } from "zustand";

type ThreadProviderProps = {
  provider: ThreadRuntime;
};

const useThreadRuntimeStore = (thread: ThreadRuntime) => {
  const [store] = useState(() => create(() => thread));

  useEffect(() => {
    const updateState = () => writableStore(store).setState(thread, true);
    updateState();
    return thread.subscribe(updateState);
  }, [thread, store]);

  return store;
};

const useThreadStore = (thread: ThreadRuntime) => {
  const [store] = useState(() => create(() => thread.getState()));
  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(thread.getState(), true);
    updateState();
    return thread.subscribe(updateState);
  }, [thread, store]);

  return store;
};

const useThreadMessagesStore = (thread: ThreadRuntime) => {
  const [store] = useState(() => create(() => thread.messages));

  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(thread.messages, true);
    updateState();
    return thread.subscribe(updateState);
  }, [thread, store]);

  return store;
};

const useThreadComposerStore = (thread: ThreadRuntime) => {
  const [store] = useState(() => makeThreadComposerStore(thread.composer));

  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(thread.composer.getState());
    updateState();
    return thread.subscribe(updateState);
  }, [thread, store]);

  return store;
};

export const ThreadProvider: FC<PropsWithChildren<ThreadProviderProps>> = ({
  children,
  provider: thread,
}) => {
  const useThreadRuntime = useThreadRuntimeStore(thread);
  const useThread = useThreadStore(thread);
  const useThreadMessages = useThreadMessagesStore(thread);
  const useThreadComposer = useThreadComposerStore(thread);

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
