"use client";

import { FC } from "react";
import {
  type AssistantToolUIProps,
  useAssistantToolUI,
} from "./useAssistantToolUI";
import { ServerTool, Parameters, ClientTool } from "./tool";
import { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";

export type AssistantToolUI = FC & {
  unstable_tool: AssistantToolUIProps<any, any>;
};

export const getToolUI = <TArgs extends Parameters, TResult>(a: {
  tool: ServerTool<TArgs, TResult> | ClientTool<TArgs, TResult>;
  render: ToolCallContentPartComponent<TArgs, TResult>;
}) => {
  const ToolUI: AssistantToolUI = () => {
    useAssistantToolUI({
      toolName: a.tool.toolName,
      render: a.render,
    });
    return null;
  };
  ToolUI.unstable_tool = {
    toolName: a.tool.toolName,
    render: a.render,
  };
  return ToolUI;
};
