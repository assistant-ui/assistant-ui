import type { FC, PropsWithChildren } from "react";
import { memo, useEffect, useInsertionEffect, useRef, useState } from "react";
import type { AssistantContextValue } from "../../context/AssistantContext";
import { AssistantContext } from "../../context/AssistantContext";
import { makeThreadStore } from "../../context/stores/Thread";
import { makeThreadComposerStore } from "../../context/stores/ThreadComposer";
import { makeThreadViewportStore } from "../../context/stores/ThreadViewport";
import type {
  AssistantRuntime,
  ReactAssistantRuntime,
} from "./AssistantRuntime";

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
      } satisfies AssistantContextValue,
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
    <AssistantContext.Provider value={context}>
      {RuntimeSynchronizer && <RuntimeSynchronizer />}
      {children}
    </AssistantContext.Provider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
