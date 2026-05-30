import type { Tool } from "assistant-stream";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

/**
 * Resolves whether a tool's UI should be presented standalone (outside the
 * chain-of-thought grouping), applying the type-based defaults.
 *
 * An explicit `display` wins. Otherwise `human` tools default to standalone
 * (they prompt the user), and every other tool defaults to inline (a trace of
 * what the model is doing). MCP-app tool calls are detected separately from
 * the part itself and are not resolved here.
 */
export const isStandaloneToolDisplay = (
  tool: Pick<Tool<any, any>, "type" | "display">,
): boolean => {
  if (tool.display) return tool.display === "standalone";
  return tool.type === "human";
};

type WithRender<T, TArgs extends Record<string, unknown>, TResult> = T extends {
  type: "frontend" | "human";
}
  ? T & { render: ToolCallMessagePartComponent<TArgs, TResult> }
  : T & {
      render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
    };

/**
 * Tool definition accepted by the React tool registry.
 *
 * Extends the core tool contract with a render component. Human tools rely on
 * the renderer to collect input from the user. Frontend tools execute in the
 * browser and require a UI surface for their progress and result. Backend
 * tools execute server-side and may omit a renderer. The `render` component is
 * required for frontend and human tools and optional for backend tools.
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
