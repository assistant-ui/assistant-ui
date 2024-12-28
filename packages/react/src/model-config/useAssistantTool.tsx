"use client";

import { useEffect } from "react";
import {
  useAssistantRuntime,
  useToolUIsStore,
} from "../context/react/AssistantContext";
import type { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";
import type { Tool } from "../types/ModelConfigTypes";

export type AssistantToolProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: ToolCallContentPartComponent<TArgs, TResult> | undefined;
  disabled?: boolean | undefined;
};

export const useAssistantTool = <
  TArgs extends Record<string, unknown>,
  TResult,
>(
  tool: AssistantToolProps<TArgs, TResult>,
) => {
  const assistantRuntime = useAssistantRuntime();
  const toolUIsStore = useToolUIsStore();

  useEffect(() => {
    return tool.render
      ? toolUIsStore.getState().setToolUI(tool.toolName, tool.render)
      : undefined;
  }, [toolUIsStore, tool.toolName, tool.render]);

  useEffect(() => {
    const { toolName, render, disabled, ...rest } = tool;
    if (disabled) return;

    const config = {
      tools: {
        [toolName]: rest,
      },
    };
    return assistantRuntime.registerModelConfigProvider({
      getModelConfig: () => config,
    });
  }, [assistantRuntime, tool]);
};
