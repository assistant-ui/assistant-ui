"use client";
import { useEffect } from "react";
import { useAssistantContext } from "../context/AssistantContext";
import type { ToolRenderComponent } from "./ToolRenderComponent";

type UseAssistantToolRenderer<TArgs, TResult> = {
  name: string;
  render: ToolRenderComponent<TArgs, TResult>;
};

export const useAssistantToolRenderer = (
  // biome-ignore lint/suspicious/noExplicitAny: intentional any
  tool: UseAssistantToolRenderer<any, any> | null,
) => {
  const { useToolRenderers } = useAssistantContext();
  const setToolRenderer = useToolRenderers((s) => s.setToolRenderer);
  useEffect(() => {
    if (!tool) return;
    const { name, render } = tool;
    return setToolRenderer(name, render);
  }, [setToolRenderer, tool]);
};
