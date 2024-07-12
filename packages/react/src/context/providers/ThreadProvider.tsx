import type { FC, PropsWithChildren } from "react";
import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactThreadRuntime } from "../../runtimes/core/ReactThreadRuntime";
import type { ThreadContextValue } from "../react/ThreadContext";
import { ThreadContext } from "../react/ThreadContext";
import { makeComposerStore } from "../stores/Composer";
import { ThreadState, makeThreadStore } from "../stores/Thread";
import { makeThreadViewportStore } from "../stores/ThreadViewport";
import { makeThreadActionStore } from "../stores/ThreadActions";
import { StoreApi } from "zustand";
import {
  ThreadMessagesState,
  makeThreadMessagesStore,
} from "../stores/ThreadMessages";
import { ThreadRuntimeWithSubscribe } from "../../runtimes/core/AssistantRuntime";

type ThreadProviderProps = {
  runtime: ThreadRuntimeWithSubscribe;
};

export const ThreadProvider: FC<PropsWithChildren<ThreadProviderProps>> = ({
  children,
  runtime,
}) => {
  const runtimeRef = useRef(runtime.thread);

  const [context] = useState<ThreadContextValue>(() => {
    const useThread = makeThreadStore(runtimeRef);
    const useThreadMessages = makeThreadMessagesStore(runtimeRef);
    const useThreadActions = makeThreadActionStore(runtimeRef);
    const useViewport = makeThreadViewportStore();
    const useComposer = makeComposerStore(useThreadMessages, useThreadActions);

    return {
      useThread,
      useThreadMessages,
      useThreadActions,
      useComposer,
      useViewport,
    };
  });

  // subscribe to thread replacements
  const thread = useSyncExternalStore(
    useCallback((c) => runtime.subscribe(c), [runtime]),
    () => runtime.thread as ReactThreadRuntime,
    () => runtime.thread as ReactThreadRuntime,
  );

  useInsertionEffect(() => {
    runtimeRef.current = thread;
  });

  // subscribe to thread updates
  useEffect(() => {
    const onThreadUpdate = () => {
      (context.useThread as unknown as StoreApi<ThreadState>).setState(
        Object.freeze({
          isRunning: runtimeRef.current.isRunning,
        }) satisfies ThreadState,
        true,
      );
      (
        context.useThreadMessages as unknown as StoreApi<ThreadMessagesState>
      ).setState(Object.freeze(runtimeRef.current.messages), true);
    };

    onThreadUpdate();
    return thread.subscribe(onThreadUpdate);
  }, [context, thread]);

  return (
    <ThreadContext.Provider value={context}>
      {thread.unstable_synchronizer && <thread.unstable_synchronizer />}
      {children}
    </ThreadContext.Provider>
  );
};
