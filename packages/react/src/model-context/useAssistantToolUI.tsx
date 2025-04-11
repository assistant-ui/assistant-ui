"use client";

import { useEffect } from "react";
import { useToolUIsStore } from "../context/react/AssistantContext";
import type { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";
import { AUIClientTool } from "./tool";

export type AssistantToolUIProps<TArgs, TResult> = {
  toolName: string;
  render: ToolCallContentPartComponent<TArgs, TResult>;
};

export const useAssistantToolUI = (
  tool: AssistantToolUIProps<any, any> | null,
) => {
  const toolUIsStore = useToolUIsStore();
  useEffect(() => {
    if (!tool) return;
    return toolUIsStore.getState().setToolUI(tool.toolName, tool.render);
  }, [toolUIsStore, tool?.toolName, tool?.render, !tool]);
};

// Exported here so it is only used on the client.
export const auiClientTool: AUIClientTool = (a) => ({
  ...a,
});
