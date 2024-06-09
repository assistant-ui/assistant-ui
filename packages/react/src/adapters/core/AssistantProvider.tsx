import type { FC, PropsWithChildren } from "react";
import { useEffect, useInsertionEffect, useRef, useState } from "react";
import type { AssistantContextValue } from "../../context/AssistantContext";
import { AssistantContext } from "../../context/AssistantContext";
import { makeThreadStore } from "../../context/stores/Thread";
import { makeThreadComposerStore } from "../../context/stores/ThreadComposer";
import { makeViewportStore } from "../../context/stores/ThreadViewport";
import type { AssistantRuntime } from "./AssistantRuntime";

type AssistantProviderProps = {
  runtime: AssistantRuntime;
};

export const AssistantProvider: FC<PropsWithChildren<AssistantProviderProps>> =
  ({ children, runtime }) => {
    const runtimeRef = useRef(runtime);
    useInsertionEffect(() => {
      runtimeRef.current = runtime;
    });

    const [{ context, onRuntimeUpdate }] = useState(() => {
      const { useThread, onRuntimeUpdate } = makeThreadStore(runtimeRef);
      const useViewport = makeViewportStore();
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

      return runtime.subscribe(onRuntimeUpdate);
    }, [onRuntimeUpdate, runtime]);

    return (
      <AssistantContext.Provider value={context}>
        {children}
      </AssistantContext.Provider>
    );
  };
