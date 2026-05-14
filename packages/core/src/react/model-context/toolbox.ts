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
 * Extends the core tool contract with a render component. Human tools rely on
 * the renderer to collect input from the user. Frontend tools execute in the
 * browser and require a UI surface for their progress and result. Backend
 * tools execute server-side and may omit a renderer.
 */
export type ToolDefinition<
  TArgs extends Record<string, unknown>,
  TResult,
> = WithRender<Tool<TArgs, TResult>, TArgs, TResult>;

/**
 * Named collection of tools exposed to the assistant model.
 *
 * Keys are the tool names the model receives and uses in tool calls.
 *
 * @example
 * ```tsx
 * const toolkit = {
 *   get_weather: {
 *     type: "frontend",
 *     description: "Get the weather for a city.",
 *     parameters: weatherSchema,
 *     execute: async ({ city }: { city: string }) => fetchWeather(city),
 *     render: WeatherToolUI,
 *   },
 * } satisfies Toolkit;
 * ```
 */
export type Toolkit = Record<string, ToolDefinition<any, any>>;

/** Configuration for the {@link Tools} resource. */
export type ToolsConfig = {
  /** Tools to register with model context and, when provided, message renderers. */
  toolkit: Toolkit;
};
