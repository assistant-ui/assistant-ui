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
    const { toolName, render, ...rest } = tool;
    const config = {
      tools: {
        [tool.toolName]: rest,
      },
    };
    const unsub1 = assistantRuntime.registerModelConfigProvider({
      getModelConfig: () => config,
    });
    const unsub2 = render
      ? toolUIsStore.getState().setToolUI(toolName, render)
      : undefined;
    return () => {
      unsub1();
      unsub2?.();
    };
  }, [assistantRuntime, toolUIsStore, tool]);
};
