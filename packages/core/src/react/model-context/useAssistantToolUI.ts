import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

/** Props used to register a renderer for tool-call message parts. */
export type AssistantToolUIProps<TArgs, TResult> = {
  /** Name of the tool whose calls should use this renderer. */
  toolName: string;
  /** Component rendered for matching tool-call message parts. */
  render: ToolCallMessagePartComponent<TArgs, TResult>;
};

/**
 * Registers a tool-call renderer while the component is mounted.
 *
 * This only affects rendering. Pair it with {@link useAssistantTool},
 * {@link Tools}, or a backend tool registry to expose the actual tool
 * definition to the model.
 *
 * @param tool - Tool renderer registration, or `null` to skip registration.
 */
export const useAssistantToolUI = (
  tool: AssistantToolUIProps<any, any> | null,
) => {
  const aui = useAui();
  useEffect(() => {
    if (!tool?.toolName || !tool?.render) return undefined;
    return aui.tools().setToolUI(tool.toolName, tool.render);
  }, [aui, tool?.toolName, tool?.render]);
};
