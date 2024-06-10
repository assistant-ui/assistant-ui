import type { FC, PropsWithChildren } from "react";
import { memo, useEffect, useInsertionEffect, useRef, useState } from "react";
import type {
  AssistantRuntime,
  ReactAssistantRuntime,
} from "../../runtime/core/AssistantRuntime";
import type { ThreadContextValue } from "../AssistantContext";
import { ThreadContext } from "../AssistantContext";
import { makeThreadStore } from "../stores/Thread";
import { makeThreadComposerStore } from "../stores/ThreadComposer";
import { makeThreadViewportStore } from "../stores/ThreadViewport";

type AssistantProviderProps = {
  runtime: AssistantRuntime;
};

const AssistantRuntimeProviderImpl: FC<
  PropsWithChildren<AssistantProviderProps>
> = ({ children, runtime }) => {
  const runtimeRef = useRef(runtime);
  useInsertionEffect(() => {
    runtimeRef.current = runtime;
  });

  const [{ context, onRuntimeUpdate }] = useState(() => {
    const { useThread, onRuntimeUpdate } = makeThreadStore(runtimeRef);
    const useViewport = makeThreadViewportStore();
    const useComposer = makeThreadComposerStore(useThread);

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

  const RuntimeSynchronizer = (runtime as ReactAssistantRuntime)
    .unstable_synchronizer;

  return (
    <ThreadContext.Provider value={context}>
      {RuntimeSynchronizer && <RuntimeSynchronizer />}
      {children}
    </ThreadContext.Provider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
