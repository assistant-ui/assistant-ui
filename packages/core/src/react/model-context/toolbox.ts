import type {
  Tool,
  ToolCallReader,
  ToolDeclaration,
  ToolModelOutputFunction,
} from "assistant-stream";
import type { ReactNode } from "react";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "../types/MessagePartComponentTypes";

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
  if (tool.display !== undefined) return tool.display === "standalone";
  return tool.type === "human";
};

type WithRender<T, TArgs extends Record<string, unknown>, TResult> = T extends {
  type: "frontend" | "human";
}
  ? T &
      (T extends { type: "frontend" }
        ?
            | { render: ToolCallMessagePartComponent<TArgs, TResult> }
            | {
                render?: ToolCallMessagePartComponent<TArgs, TResult>;
                renderText: ToolCallText<TArgs, TResult>;
              }
        : { render: ToolCallMessagePartComponent<TArgs, TResult> })
  : T & {
      render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
      renderText?: ToolCallText<TArgs, TResult> | undefined;
    };

type ToolParameters<TArgs extends Record<string, unknown>> =
  ToolDeclaration<TArgs>["parameters"];

// ToolExecutionContext is not re-exported from assistant-stream's public entry.
type ToolExecuteContext = Parameters<
  NonNullable<ToolDeclaration["execute"]>
>[1];

type ToolExecute<TArgs extends Record<string, unknown>, TResult> = (
  args: TArgs,
  context: ToolExecuteContext,
) => TResult | Promise<TResult>;

type ToolStreamCall<TArgs extends Record<string, unknown>, TResult> = (
  reader: ToolCallReader<TArgs, TResult>,
  context: ToolExecuteContext,
) => void;

type ToolCallRunningText<TArgs extends Record<string, unknown>> =
  | ReactNode
  | ((options: { args: TArgs }) => ReactNode);

type ToolCallCompleteText<TArgs extends Record<string, unknown>, TResult> =
  | ReactNode
  | ((options: { args: TArgs; result: TResult | undefined }) => ReactNode);

export type ToolCallText<TArgs extends Record<string, unknown>, TResult> =
  | {
      running: ToolCallRunningText<TArgs>;
      complete?: ToolCallCompleteText<TArgs, TResult> | undefined;
    }
  | {
      running?: ToolCallRunningText<TArgs> | undefined;
      complete: ToolCallCompleteText<TArgs, TResult>;
    };

const resolveToolCallText = <TArgs extends Record<string, unknown>, TResult>(
  text: ToolCallText<TArgs, TResult>,
  part: ToolCallMessagePartProps<TArgs, TResult>,
): ReactNode => {
  const isRunning =
    part.status?.type === "running" || part.status?.type === "requires-action";

  if (!isRunning) {
    const value = text.complete;
    if (typeof value !== "function") return value ?? null;
    return value({ args: part.args, result: part.result });
  }

  const value = text.running;
  if (typeof value !== "function") return value ?? null;
  return value({ args: part.args });
};

export const makeToolCallTextComponent = <
  TArgs extends Record<string, unknown>,
  TResult,
>(
  text: ToolCallText<TArgs, TResult>,
): ((part: ToolCallMessagePartProps<TArgs, TResult>) => ReactNode) => {
  return function ToolCallTextComponent(part) {
    return resolveToolCallText(text, part);
  };
};

/**
 * Tool definition accepted by the React tool registry.
 *
 * Extends the core tool contract with tool-call display options. Human tools
 * rely on `render` to collect input from the user. Frontend tools execute in
 * the browser and require either `render` or `renderText` for their progress
 * and result. Backend tools execute server-side and may omit a renderer.
 */
export type ToolDefinition<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> = WithRender<Tool<TArgs, TResult>, TArgs, TResult>;

/**
 * Named collection of tools exposed to the assistant model.
 *
 * Keys are the tool names the model receives and uses in tool calls.
 *
 * @example
 * ```tsx
 * const toolkit = defineToolkit({
 *   get_weather: {
 *     type: "frontend",
 *     description: "Get the weather for a city.",
 *     parameters: weatherSchema,
 *     execute: async ({ city }: { city: string }) => fetchWeather(city),
 *     render: WeatherToolUI,
 *   },
 * });
 * ```
 */
export type Toolkit = Record<string, ToolDefinition<any, any>>;

/**
 * A tool as authored, before the build splits it: like {@link ToolDefinition}
 * but it may declare `description`, `parameters`, and a server-side `execute`
 * alongside its `render`. The `type` field is **not** authored — the
 * `"use generative"` compiler infers it (`execute: humanTool()` → human;
 * `execute: providerTool(...)` → provider; `execute` with a `"use client"`
 * directive → frontend; otherwise backend) and writes it back — so declaring it
 * here is a type error.
 */
type OverrideOptionalField<
  T,
  TKey extends keyof T,
  TValue,
> = undefined extends T[TKey]
  ? // Preserve `?: undefined` fields (for variants that explicitly disallow a
    // callback) instead of widening them to accept the override value.
    Exclude<T[TKey], undefined> extends never
    ? { [K in TKey]?: undefined }
    : { [K in TKey]?: TValue | undefined }
  : { [K in TKey]: TValue };

type OverrideToolDeclarationCallbacks<
  T extends { streamCall?: unknown },
  TArgs extends Record<string, unknown>,
  TResult,
> = Omit<
  T,
  | "type"
  | "execute"
  | "toModelOutput"
  | "experimental_onSchemaValidationError"
  | "streamCall"
> & {
  type?: never;
} & ("execute" extends keyof T
    ? OverrideOptionalField<T, "execute", ToolExecute<NoInfer<TArgs>, TResult>>
    : {}) &
  ("toModelOutput" extends keyof T
    ? OverrideOptionalField<
        T,
        "toModelOutput",
        ToolModelOutputFunction<NoInfer<TArgs>, NoInfer<TResult>>
      >
    : {}) &
  ("experimental_onSchemaValidationError" extends keyof T
    ? OverrideOptionalField<
        T,
        "experimental_onSchemaValidationError",
        (
          args: unknown,
          context: ToolExecuteContext,
        ) => NoInfer<TResult> | Promise<NoInfer<TResult>>
      >
    : {}) &
  OverrideOptionalField<T, "streamCall", ToolStreamCall<TArgs, unknown>>;

// Keep the authored shape tied to ToolDeclaration's union variants while
// overriding callback fields to avoid inference pollution.
type ToolkitDefinitionInput<
  TArgs extends Record<string, unknown>,
  TResult,
> = WithRender<
  ToolDeclaration<TArgs, TResult> extends infer T
    ? T extends { streamCall?: unknown }
      ? OverrideToolDeclarationCallbacks<T, TArgs, TResult>
      : never
    : never,
  TArgs,
  TResult
>;

/**
 * A single entry in a {@link ToolkitDefinition}.
 *
 * Either authored inline (whose `type` the compiler infers) or an already-formed
 * {@link ToolDefinition} produced by a factory whose own build splits it across
 * targets — e.g. `new JSONGenerativeUI({ library }).present()`. The factory case
 * carries a `type`, so it can only match the {@link ToolDefinition} arm of this
 * union.
 */
export type ToolkitDefinitionEntry<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> = ToolkitDefinitionInput<TArgs, TResult> | ToolDefinition<any, any>;

export type ToolkitDefinitionEntryWithParameters<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> = ToolkitDefinitionInput<TArgs, TResult> & {
  parameters: NonNullable<ToolParameters<TArgs>>;
};

/**
 * The permissive, authoring-time counterpart to {@link Toolkit} — the input to
 * {@link defineToolkit}. Backend entries may carry their server `execute` here;
 * the canonical {@link Toolkit} keeps those fields `undefined`.
 */
export type ToolkitDefinition<
  TArgsByName extends {
    [K in keyof TArgsByName]: Record<string, unknown>;
  } = Record<string, any>,
  TResultByName extends { [K in keyof TArgsByName]: unknown } = {
    [K in keyof TArgsByName]: any;
  },
> = {
  [K in keyof TArgsByName]: ToolkitDefinitionEntry<
    TArgsByName[K],
    TResultByName[K]
  >;
};

/** Configuration for the {@link Tools} resource. */
export type ToolsConfig = {
  /** Tools to register with model context and, when provided, message renderers. */
  toolkit: Toolkit;
};
