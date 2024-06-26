"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/react/AssistantContext";
import type { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";

export type AssistantToolUIProps<TArgs, TResult> = {
  toolName: string;
  render: ToolCallContentPartComponent<TArgs, TResult>;
};

export const useAssistantToolUI = (
  tool: AssistantToolUIProps<any, any> | null,
) => {
  const { useToolUIs } = useAssistantContext();
  const setToolUI = useToolUIs((s) => s.setToolUI);
  useEffect(() => {
    if (!tool) return;
    const { toolName, render } = tool;
    return setToolUI(toolName, render);
  }, [setToolUI, tool]);
};
