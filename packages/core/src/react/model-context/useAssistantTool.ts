import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { AssistantToolProps as CoreAssistantToolProps } from "../..";

/**
 * Props used to register a tool from React.
 */
export type AssistantToolProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = CoreAssistantToolProps<TArgs, TResult> & {
  /** Component used to render calls to this tool in assistant messages. */
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
};

/**
 * Registers a tool with the assistant model context while the component is
 * mounted.
 *
 * If `render` is provided, it is also installed as the renderer for matching
 * tool-call message parts. The registration is removed automatically when the
 * component unmounts or the tool definition changes.
 *
 * @param tool - Tool definition and name to register.
 */
export const useAssistantTool = <
  TArgs extends Record<string, unknown>,
  TResult,
>(
  tool: AssistantToolProps<TArgs, TResult>,
) => {
  const aui = useAui();

  useEffect(() => {
    if (!tool.render) return undefined;
    return aui.tools().setToolUI(tool.toolName, tool.render);
  }, [aui, tool.toolName, tool.render]);

  useEffect(() => {
    const { toolName, render, ...rest } = tool;
    const context = {
      tools: {
        [toolName]: rest,
      },
    };
    return aui.modelContext().register({
      getModelContext: () => context,
    });
  }, [aui, tool]);
};
