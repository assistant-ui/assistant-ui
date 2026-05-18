import type { FC } from "react";
import { type AssistantToolProps, useAssistantTool } from "./useAssistantTool";

/**
 * Component returned by {@link makeAssistantTool}.
 *
 * Rendering the component registers its tool for the lifetime of that render
 * subtree.
 */
export type AssistantTool = FC & {
  /** Tool definition registered by this component. */
  unstable_tool: AssistantToolProps<any, any>;
};

/**
 * Creates a React component that registers an assistant tool when rendered.
 *
 * Use this when exporting reusable tool modules that can be included in JSX
 * rather than calling {@link useAssistantTool} directly.
 *
 * @param tool - Tool definition and name to register.
 */
export const makeAssistantTool = <
  TArgs extends Record<string, unknown>,
  TResult,
>(
  tool: AssistantToolProps<TArgs, TResult>,
) => {
  const Tool: AssistantTool = () => {
    useAssistantTool(tool);
    return null;
  };
  Tool.unstable_tool = tool;
  return Tool;
};
