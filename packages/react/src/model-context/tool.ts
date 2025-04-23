import { Tool } from "assistant-stream";

export function tool<TArgs extends Record<string, unknown>, TResult = any>(
  tool: Tool<TArgs, TResult>,
): Tool<TArgs, TResult> {
  return tool;
}
