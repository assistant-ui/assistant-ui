import { BackendTool, FrontendTool, HumanTool, Tool } from "assistant-stream";
// import { ToolCallContentPartComponent } from "../types";

// TODO re-add the inferrence of the parameters

export function tool<TArgs extends Record<string, unknown>, TResult = any>(
  tool: Tool<TArgs, TResult>,
): Tool<TArgs, TResult> {
  return tool;
}

export function createToolbox<BackendTools extends Record<string, BackendTool>>(
  // renders: {
  //   [K in keyof BackendTools]:
  // },
  // tools?: Record<string, FrontendTool | HumanTool>,
  tools: {
    [K in keyof BackendTools]: boolean;
  },
  // | Record<string, FrontendTool | HumanTool>,
): Record<string, FrontendTool | HumanTool> {
  const toolbox = Object.assign(
    {},
    ...Object.entries(tools).map(([key]) => ({
      [key]: {
        // render: renders[key as keyof BackendTools],
        type: "frontend", // ensure type is set to frontend
      },
    })),
  );

  if (tools) {
    Object.assign(toolbox, tools);
  }

  return toolbox;
}
