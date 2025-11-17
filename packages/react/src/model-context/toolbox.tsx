"use client";

import type { Tool } from "assistant-stream";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

export type ToolDefinition<
  TArgs extends Record<string, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
};

export type Toolkit = Record<string, ToolDefinition<any, any>>;

export type ToolsConfig = {
  toolkit: Toolkit;
};
