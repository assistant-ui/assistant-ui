import type { Tool } from "assistant-stream";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { ToolActivity } from "../types";

export type ToolDefinition<
  TArgs extends Record<string, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
  activity?: ToolActivity | undefined;
};

export type Toolkit = Record<string, ToolDefinition<any, any>>;

export type ToolsConfig = {
  toolkit: Toolkit;
};
