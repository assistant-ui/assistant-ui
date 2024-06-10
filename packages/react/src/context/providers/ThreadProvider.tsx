import type { FC, PropsWithChildren } from "react";
import { useEffect, useInsertionEffect, useRef, useState } from "react";
import type {
  ReactThreadRuntime,
  ThreadRuntime,
} from "../../runtime/core/ThreadRuntime";
import type { ThreadContextValue } from "../ThreadContext";
import { ThreadContext } from "../ThreadContext";
import { makeComposerStore } from "../stores/Composer";
import { makeThreadStore } from "../stores/Thread";
import { makeThreadViewportStore } from "../stores/ThreadViewport";

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

  const [{ context, onRuntimeUpdate }] = useState(() => {
    const { useThread, onRuntimeUpdate } = makeThreadStore(runtimeRef);
    const useViewport = makeThreadViewportStore();
    const useComposer = makeComposerStore(useThread);

    return {
      context: {
        useViewport,
        useThread,
        useComposer,
      } satisfies ThreadContextValue,
      onRuntimeUpdate,
    };
  });

  useEffect(() => {
    // whenever the runtime changes
    onRuntimeUpdate();

    // subscribe to runtime updates
    return runtime.subscribe(onRuntimeUpdate);
  }, [onRuntimeUpdate, runtime]);

  const RuntimeSynchronizer = (runtime as ReactThreadRuntime)
    .unstable_synchronizer;

  return (
    <ThreadContext.Provider value={context}>
      {RuntimeSynchronizer && <RuntimeSynchronizer />}
      {children}
    </ThreadContext.Provider>
  );
};
