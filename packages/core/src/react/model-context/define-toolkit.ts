import type {
  Toolkit,
  ToolkitDefinition,
  ToolkitDefinitionEntryWithParameters,
} from "./toolbox";

/**
 * Toolkit authoring helper. Accepts the permissive {@link ToolkitDefinition}
 * (a generative `backend` tool may carry its server `execute`) and types the
 * result as the canonical {@link Toolkit}.
 *
 * In a `"use generative"` file, the compiler strips the wrapper per build so it
 * can split schemas, renderers, and executors across the client/server boundary.
 * The file's default export must be a `defineToolkit(...)` or
 * `defineMcpToolkit(...)` call, every tool must be an inline object literal with
 * an `execute`, and the tool kind is inferred from `execute`: a plain function is
 * a backend tool, a function whose body starts with `"use client"` is a frontend
 * tool, and `humanTool()`, `providerTool(...)`, `stubTool()`, and `externalTool()`
 * select the other kinds. Never write `type` in such a file.
 *
 * Outside generative compilation, it returns the toolkit unchanged and can be
 * used for plain frontend/backend/human toolkit objects that spell out `type`.
 * Register the result with `Tools`.
 *
 * @example
 * ```tsx
 * "use generative";
 *
 * import { defineToolkit } from "@assistant-ui/react";
 * import { z } from "zod";
 *
 * export default defineToolkit({
 *   get_weather: {
 *     description: "Get the weather for a city.",
 *     parameters: z.object({ city: z.string() }),
 *     execute: async ({ city }) => fetchWeather(city),
 *     render: ({ args, result }) => (
 *       <WeatherCard city={args.city} weather={result} />
 *     ),
 *   },
 * });
 * ```
 */
export function defineToolkit<
  TArgsByName extends {
    [K in keyof TArgsByName]: Record<string, unknown>;
  },
  TResultByName extends { [K in keyof TArgsByName]: unknown } = {
    [K in keyof TArgsByName]: any;
  },
>(_definition: {
  [K in keyof TArgsByName]: ToolkitDefinitionEntryWithParameters<
    TArgsByName[K],
    TResultByName[K]
  >;
}): Toolkit & {
  [K in keyof TArgsByName]: ToolkitDefinitionEntryWithParameters<
    TArgsByName[K],
    TResultByName[K]
  >;
};
export function defineToolkit<const TDefinition extends ToolkitDefinition>(
  _definition: TDefinition,
): Toolkit & TDefinition;
export function defineToolkit(_definition: ToolkitDefinition): Toolkit {
  return _definition as Toolkit;
}
