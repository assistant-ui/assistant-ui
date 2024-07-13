"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/react/AssistantContext";
import type { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";
import type { Tool } from "../types/ModelConfigTypes";

export type AssistantToolProps<
  TArgs extends Record<string | number, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: ToolCallContentPartComponent<TArgs, TResult> | undefined;
};

export const useAssistantTool = <
  TArgs extends Record<string | number, unknown>,
  TResult,
>(
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
    const unsub1 = registerModelConfigProvider({
      getModelConfig: () => config,
    });
    const unsub2 = render ? setToolUI(toolName, render) : undefined;
    return () => {
      unsub1();
      unsub2?.();
    };
  }, [registerModelConfigProvider, setToolUI, tool]);
};
