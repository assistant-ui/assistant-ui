import type { Tool } from "assistant-stream";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

type WithRender<T, TArgs extends Record<string, unknown>, TResult> = T extends {
  type: "frontend" | "human";
}
  ? T & { render: ToolCallMessagePartComponent<TArgs, TResult> }
  : T & { render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined };

export type ToolDefinition<
  TArgs extends Record<string, unknown>,
  TResult,
> = WithRender<Tool<TArgs, TResult>, TArgs, TResult>;

export type Toolkit = Record<string, ToolDefinition<any, any>>;

export type ToolsConfig = {
  toolkit: Toolkit;
};
