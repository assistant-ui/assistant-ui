"use client";

import { useEffect } from "react";
import {
  useAssistantRuntime,
  useToolUIsStore,
} from "../context/react/AssistantContext";
import type { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";
import type { Tool } from "./ModelContextTypes";
import { ReadonlyJSONObject } from "../utils/json/json-value";

export type AssistantToolProps<
  TArgs extends ReadonlyJSONObject,
  TResult,
> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: ToolCallContentPartComponent<TArgs, TResult> | undefined;
  disabled?: boolean | undefined;
};

export const useAssistantTool = <TArgs extends ReadonlyJSONObject, TResult>(
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

    const context = {
      tools: {
        [toolName]: rest,
      },
    };
    return assistantRuntime.registerModelContextProvider({
      getModelContext: () => context,
    });
  }, [assistantRuntime, tool]);
};
