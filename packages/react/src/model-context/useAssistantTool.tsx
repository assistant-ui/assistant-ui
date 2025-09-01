"use client";

import { useEffect } from "react";
import { useAssistantApi } from "../context/react/AssistantApiContext";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { Tool } from "assistant-stream";

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
  const { actions } = useAssistantApi();

  useEffect(() => {
    if (tool.render) {
      actions.toolUIs.setToolUI(tool.toolName, tool.render);
    }
  }, [actions, tool.toolName, tool.render]);

  useEffect(() => {
    const { toolName, render, ...rest } = tool;
    const context = {
      tools: {
        [toolName]: rest,
      },
    };
    return actions.registerModelContextProvider({
      getModelContext: () => context,
    });
  }, [actions, tool]);
};
