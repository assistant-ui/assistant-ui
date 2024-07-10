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
import type { ThreadRuntime } from "../../runtimes/core/ThreadRuntime";
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

type ThreadProviderProps = {
  runtime: ThreadRuntime;
};

export const ThreadProvider: FC<PropsWithChildren<ThreadProviderProps>> = ({
  children,
  runtime,
}) => {
  const runtimeRef = useRef(runtime);
  useInsertionEffect(() => {
    runtimeRef.current = runtime;
  });

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

  // subscribe to runtime updates
  useEffect(() => {
    const onRuntimeUpdate = () => {
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
    onRuntimeUpdate();
    return runtime.subscribe(onRuntimeUpdate);
  }, [context, runtime]);

  const subscribe = useCallback(
    (c: () => void) => runtime.subscribe(c),
    [runtime],
  );

  const RuntimeSynchronizer = useSyncExternalStore(
    subscribe,
    () => (runtime as ReactThreadRuntime).unstable_synchronizer,
    () => undefined,
  );

  return (
    <ThreadContext.Provider value={context}>
      {RuntimeSynchronizer && <RuntimeSynchronizer />}
      {children}
    </ThreadContext.Provider>
  );
};
