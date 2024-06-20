"use client";
import { useEffect } from "react";
import { useAssistantContext } from "../context/AssistantContext";
import type { ToolCallContentPartComponent } from "../primitives/message/ContentPartComponentTypes";

export type AssistantToolRendererProps<TArgs, TResult> = {
  name: string;
  render: ToolCallContentPartComponent<TArgs, TResult>;
};

export const useAssistantToolRenderer = (
  tool: AssistantToolRendererProps<any, any> | null,
) => {
  const { useToolRenderers } = useAssistantContext();
  const setToolRenderer = useToolRenderers((s) => s.setToolRenderer);
  useEffect(() => {
    if (!tool) return;
    const { name, render } = tool;
    return setToolRenderer(name, render);
  }, [setToolRenderer, tool]);
};
