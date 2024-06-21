import type { FC, PropsWithChildren } from "react";
import { useEffect, useInsertionEffect, useRef, useState } from "react";
import type { AssistantRuntime } from "../../runtime";
import { AssistantContext } from "../AssistantContext";
import { makeAssistantModelConfigStore } from "../stores/AssistantModelConfig";
import { makeAssistantToolUIsStore } from "../stores/AssistantToolUIs";
import { ThreadProvider } from "./ThreadProvider";

type AssistantProviderProps = {
  runtime: AssistantRuntime;
};

export const AssistantProvider: FC<
  PropsWithChildren<AssistantProviderProps>
> = ({ children, runtime }) => {
  const runtimeRef = useRef(runtime);
  useInsertionEffect(() => {
    runtimeRef.current = runtime;
  });

  const [context] = useState(() => {
    const useModelConfig = makeAssistantModelConfigStore();
    const useToolUIs = makeAssistantToolUIsStore();

    return { useModelConfig, useToolUIs };
  });

  const getModelCOnfig = context.useModelConfig((c) => c.getModelConfig);
  useEffect(() => {
    return runtime.registerModelConfigProvider(getModelCOnfig);
  }, [runtime, getModelCOnfig]);

  return (
    <AssistantContext.Provider value={context}>
      <ThreadProvider runtime={runtime}>{children}</ThreadProvider>
    </AssistantContext.Provider>
  );
};
