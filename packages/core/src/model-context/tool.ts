import type { Tool } from "assistant-stream";

type StandardSchemaInput<TSchema> = TSchema extends {
  readonly "~standard": {
    readonly types?: { readonly input: infer TInput } | undefined;
  };
}
  ? TInput extends Record<string, unknown>
    ? TInput
    : Record<string, unknown>
  : Record<string, unknown>;

type StandardSchemaParameters = {
  readonly "~standard": {
    readonly types?:
      | { readonly input: Record<string, unknown>; readonly output?: unknown }
      | undefined;
  };
};

/**
 * Defines a model tool with its argument schema, execution behavior, and
 * optional model-output conversion.
 *
 * This helper keeps reusable tool definitions type-checked and convenient to
 * export for a {@link Toolkit} registered with {@link Tools}.
 * When `parameters` is a Standard Schema (for example Zod v4), its input type
 * is inferred for `execute`, `streamCall`, and model-output callbacks. Plain
 * JSON Schema objects do not carry TypeScript input types, so provide generic
 * arguments or annotate callbacks when you need precise args for JSON Schema.
 *
 * @param tool - Tool definition to expose to the assistant model.
 *
 * @example
 * ```ts
 * const getWeather = tool({
 *   type: "frontend",
 *   description: "Get the weather for a city.",
 *   parameters: z.object({ city: z.string() }),
 *   execute: async ({ city }) => `Sunny in ${city}`,
 * });
 * ```
 */
export function tool<
  const TSchema extends StandardSchemaParameters,
  TResult = any,
>(
  tool: Tool<StandardSchemaInput<TSchema>, TResult> & { parameters: TSchema },
): Tool<StandardSchemaInput<TSchema>, TResult>;
export function tool<TArgs extends Record<string, unknown>, TResult = any>(
  tool: Tool<TArgs, TResult>,
): Tool<TArgs, TResult>;
export function tool<TArgs extends Record<string, unknown>, TResult = any>(
  tool: Tool<TArgs, TResult>,
): Tool<TArgs, TResult> {
  return tool;
}
