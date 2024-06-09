import type { FC, PropsWithChildren } from "react";
import {
  type MutableRefObject,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
} from "react";
import { create } from "zustand";
import { AssistantContext } from "../../utils/context/AssistantContext";
import type {
  AssistantStore,
  ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { makeThreadComposerStore } from "../../utils/context/stores/ComposerStore";
import { makeViewportStore } from "../../utils/context/stores/ViewportStore";
import type { AssistantRuntime } from "./AssistantRuntime";

const makeThreadStore = (runtimeRef: MutableRefObject<AssistantRuntime>) => {
  const useThread = create<ThreadState>(() => ({
    messages: runtimeRef.current.messages,
    isRunning: runtimeRef.current.isRunning,
    getBranches: (messageId) => runtimeRef.current.getBranches(messageId),
    switchToBranch: (branchId) => runtimeRef.current.switchToBranch(branchId),
    startRun: (parentId) => runtimeRef.current.startRun(parentId),
    append: (message) => runtimeRef.current.append(message),
    cancelRun: () => runtimeRef.current.cancelRun(),
  }));

  const onRuntimeUpdate = () => {
    useThread.setState({
      messages: runtimeRef.current.messages,
      isRunning: runtimeRef.current.isRunning,
    });
  };

  return {
    useThread,
    onRuntimeUpdate,
  };
};

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
        } satisfies AssistantStore,
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
