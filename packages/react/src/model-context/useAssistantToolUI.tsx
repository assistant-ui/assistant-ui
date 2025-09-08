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
  const api = useAssistantApi();
  useEffect(() => {
    if (!tool?.toolName || !tool?.render) return undefined;
    return api.toolUIs().setToolUI(tool.toolName, tool.render);
  }, [api, tool?.toolName, tool?.render]);
};
