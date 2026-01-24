"use client";

import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

export type AssistantToolUIProps<TArgs, TResult> = {
  toolName: string;
  render: ToolCallMessagePartComponent<TArgs, TResult>;
};

export const useAssistantToolUI = (
  tool: AssistantToolUIProps<any, any> | null,
) => {
  const aui = useAui();
  useEffect(() => {
    if (!tool?.toolName || !tool?.render) return undefined;
    return aui.tools().setToolUI(tool.toolName, tool.render);
  }, [aui, tool?.toolName, tool?.render]);
};
