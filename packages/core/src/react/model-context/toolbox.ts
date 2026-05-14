import type { Tool } from "assistant-stream";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

type RequiredToolRenderConfig<TArgs, TResult> = {
  /** Component used to render calls to this tool in assistant messages. */
  render: ToolCallMessagePartComponent<TArgs, TResult>;
};

type OptionalToolRenderConfig<TArgs, TResult> = {
  /** Optional component used to render calls to this tool in assistant messages. */
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
};

type WithRender<T, TArgs extends Record<string, unknown>, TResult> = T extends {
  type: "frontend" | "human";
}
  ? T & RequiredToolRenderConfig<TArgs, TResult>
  : T & OptionalToolRenderConfig<TArgs, TResult>;

/**
 * Tool definition accepted by the React tool registry.
 *
 * Extends the core tool contract with an optional render component. Frontend
 * and human tools require a renderer so users can inspect the call and provide
 * results when needed; backend tools may omit one.
 */
export type ToolDefinition<
  TArgs extends Record<string, unknown>,
  TResult,
> = WithRender<Tool<TArgs, TResult>, TArgs, TResult>;

/**
 * Named collection of tools exposed to the assistant model.
 *
 * Keys are the tool names the model receives and uses in tool calls.
 */
export type Toolkit = Record<string, ToolDefinition<any, any>>;

/** Configuration for the {@link Tools} resource. */
export type ToolsConfig = {
  /** Tools to register with model context and, when provided, message renderers. */
  toolkit: Toolkit;
};
