import type { FC } from "react";
import {
  type AssistantToolUIProps,
  useAssistantToolUI,
} from "./useAssistantToolUI";

/**
 * Component returned by {@link makeAssistantToolUI}.
 *
 * Rendering the component registers a renderer for matching tool-call message
 * parts.
 */
export type AssistantToolUI = FC & {
  /** Tool renderer registered by this component. */
  unstable_tool: AssistantToolUIProps<any, any>;
};

/**
 * Creates a React component that registers a tool-call renderer when rendered.
 *
 * Use this to package reusable display components for tools whose definitions
 * are registered elsewhere.
 *
 * @param tool - Tool renderer registration.
 */
export const makeAssistantToolUI = <TArgs, TResult>(
  tool: AssistantToolUIProps<TArgs, TResult>,
) => {
  const ToolUI: AssistantToolUI = () => {
    useAssistantToolUI(tool);
    return null;
  };
  ToolUI.unstable_tool = tool;
  return ToolUI;
};
