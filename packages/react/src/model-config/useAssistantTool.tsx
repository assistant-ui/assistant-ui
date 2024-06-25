"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/react/AssistantContext";
import type { ToolCallContentPartComponent } from "../primitives/message/ContentPartComponentTypes";
import type { Tool } from "../utils/ModelConfigTypes";

export type AssistantToolProps<TArgs, TResult> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: ToolCallContentPartComponent<TArgs, TResult>;
};

export const useAssistantTool = <TArgs, TResult>(
  tool: AssistantToolProps<TArgs, TResult>,
) => {
  const { useModelConfig, useToolUIs } = useAssistantContext();
  const registerModelConfigProvider = useModelConfig(
    (s) => s.registerModelConfigProvider,
  );
  const setToolUI = useToolUIs((s) => s.setToolUI);
  useEffect(() => {
    const { toolName, render, ...rest } = tool;
    const config = {
      tools: {
        [tool.toolName]: rest,
      },
    };
    const unsub1 = registerModelConfigProvider(() => config);
    const unsub2 = render ? setToolUI(toolName, render) : undefined;
    return () => {
      unsub1();
      unsub2?.();
    };
  }, [registerModelConfigProvider, setToolUI, tool]);
};
