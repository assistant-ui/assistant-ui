"use client";

import { useEffect } from "react";
import { useToolUIsStore } from "../context/react/AssistantContext";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { Tool } from "assistant-stream";
import { useAssistantActions } from "../context/react/AssistantActionsContext";

export type AssistantToolProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
};

export const useAssistantTool = <
  TArgs extends Record<string, unknown>,
  TResult,
>(
  tool: AssistantToolProps<TArgs, TResult>,
) => {
  const assistantActions = useAssistantActions();
  const toolUIsStore = useToolUIsStore();

  useEffect(() => {
    return tool.render
      ? toolUIsStore.getState().setToolUI(tool.toolName, tool.render)
      : undefined;
  }, [toolUIsStore, tool.toolName, tool.render]);

  useEffect(() => {
    const { toolName, render, ...rest } = tool;
    const context = {
      tools: {
        [toolName]: rest,
      },
    };
    return assistantActions.registerModelContextProvider({
      getModelContext: () => context,
    });
  }, [assistantActions, tool]);
};
