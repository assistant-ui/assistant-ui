import type { Tool } from "assistant-stream";

// TODO re-add the inferrence of the parameters

/**
 * Defines a model tool with its argument schema, execution behavior, and
 * optional model-output conversion.
 *
 * This helper keeps reusable tool definitions type-checked and convenient to
 * export for a {@link Toolkit} registered with {@link Tools}.
 * Inference from parameter schemas is currently limited, so provide generic
 * arguments when you need precise args or result types.
 *
 * @param tool - Tool definition to expose to the assistant model.
 *
 * @example
 * ```ts
 * const getWeather = tool<{ city: string }, string>({
 *   type: "frontend",
 *   description: "Get the weather for a city.",
 *   parameters: {
 *     type: "object",
 *     properties: { city: { type: "string" } },
 *     required: ["city"],
 *   },
 *   execute: async ({ city }) => `Sunny in ${city}`,
 * });
 * ```
 */
export function tool<TArgs extends Record<string, unknown>, TResult = any>(
  tool: Tool<TArgs, TResult>,
): Tool<TArgs, TResult> {
  return tool;
}
