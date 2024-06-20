"use client";
import {
  type AssistantToolRendererProps,
  useAssistantToolRenderer,
} from "./useAssistantToolRenderer";

export const makeToolRenderer = <TArgs, TResult>(
  tool: AssistantToolRendererProps<TArgs, TResult>,
) => {
  const ToolRenderer = () => {
    useAssistantToolRenderer(tool);
    return null;
  };
  return ToolRenderer;
};
