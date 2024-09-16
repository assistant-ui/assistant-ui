"use client";

import { useEffect } from "react";
import { useToolUIsStore } from "../context/react/AssistantContext";
import type { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";

export type AssistantToolUIProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = {
  toolName: string;
  render: ToolCallContentPartComponent<TArgs, TResult>;
};

export const useAssistantToolUI = (
  tool: AssistantToolUIProps<any, any> | null,
) => {
  const toolUIsStore = useToolUIsStore();
  useEffect(() => {
    if (!tool) return;
    const { toolName, render } = tool;
    return toolUIsStore.getState().setToolUI(toolName, render);
  }, [toolUIsStore, tool]);
};
