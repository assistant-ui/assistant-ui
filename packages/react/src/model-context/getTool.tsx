"use client";

import { FC } from "react";
import { type AssistantToolProps, useAssistantTool } from "./useAssistantTool";
import { Parameters, ClientTool } from "./tool";
import { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";

export type AssistantTool = FC & {
  unstable_tool: AssistantToolProps<any, any>;
};

export const registerTool = <TArgs extends Parameters, TResult>(a: {
  tool: ClientTool<TArgs, TResult>;
  render: ToolCallContentPartComponent<TArgs, TResult>;
}) => {
  const Tool: AssistantTool = () => {
    useAssistantTool({
      toolName: a.tool.toolName,
      render: a.render,
      parameters: a.tool.parameters,
    });
    return null;
  };
  Tool.unstable_tool = {
    toolName: a.tool.toolName,
    render: a.render,
    parameters: a.tool.parameters,
  };
  return Tool;
};
