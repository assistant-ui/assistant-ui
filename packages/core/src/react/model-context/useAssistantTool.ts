import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { ToolActivity } from "../types";
import type { AssistantToolProps as CoreAssistantToolProps } from "../..";

export type AssistantToolProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = CoreAssistantToolProps<TArgs, TResult> & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
  activity?: ToolActivity | undefined;
};

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
    if (!tool.activity) return undefined;
    return aui.tools().setToolActivity(tool.toolName, tool.activity);
  }, [aui, tool.toolName, tool.activity]);

  useEffect(() => {
    const { toolName, render, activity, ...rest } = tool;
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
