import { BackendTool, Tool } from "assistant-stream";

// TODO re-add the inferrence of the parameters

export function tool<TArgs extends Record<string, unknown>, TResult = any>(
  tool: Tool<TArgs, TResult>,
): Tool<TArgs, TResult> {
  return tool;
}

export function createToolbox<
  TArgs extends Record<string, BackendTool>,
  TResult = any,
>(tools?: Tool<TArgs, TResult>[]) {
  return tools;
}
