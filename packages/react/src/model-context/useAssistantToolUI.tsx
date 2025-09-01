"use client";

import { useEffect } from "react";
import { useAssistantApi } from "../context/react/AssistantApiContext";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

export type AssistantToolUIProps<TArgs, TResult> = {
  toolName: string;
  render: ToolCallMessagePartComponent<TArgs, TResult>;
};

export const useAssistantToolUI = (
  tool: AssistantToolUIProps<any, any> | null,
) => {
  const { actions } = useAssistantApi();
  useEffect(() => {
    if (!tool?.toolName || !tool?.render) return;
    actions.toolUIs.setToolUI(tool.toolName, tool.render);
  }, [actions, tool?.toolName, tool?.render]);
};
