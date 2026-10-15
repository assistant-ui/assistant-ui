import type { JsonSchema } from "../json-schema";

export type { JsonSchema };

/** A model-facing tool, independent of any provider SDK. */
export type ToolDefinition<Input, Output> = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(input: Input): Promise<Output>;
};

export type AnyTool = ToolDefinition<never, unknown>;

/** A `read_me` module contributed from outside the built-in set. */
export type GuidanceModule = {
  name: string;
  /** One line shown in the `read_me` module list. */
  summary: string;
  guidance(): string;
};

/**
 * Converts tools to the Vercel AI SDK shape without depending on it: pass
 * the SDK's own `jsonSchema` helper, e.g.
 * `toAISDKTools(tools, { jsonSchema })` with `import { jsonSchema } from "ai"`.
 */
export function toAISDKTools<T extends Record<string, AnyTool>, Schema>(
  tools: T,
  sdk: { jsonSchema: (schema: JsonSchema) => Schema },
): {
  [K in keyof T]: {
    description: string;
    inputSchema: Schema;
    execute: T[K]["execute"];
  };
} {
  const result: Record<string, unknown> = {};
  for (const [key, tool] of Object.entries(tools)) {
    result[key] = {
      description: tool.description,
      inputSchema: sdk.jsonSchema(tool.inputSchema),
      execute: (input: never) => tool.execute(input),
    };
  }
  return result as never;
}

/**
 * Each tool's name, description, and input schema without `execute`, for
 * declaring tools to a model where they do not run, e.g. on a server that
 * forwards calls to tools executing in the browser.
 */
export function getToolDeclarations<T extends Record<string, AnyTool>>(
  tools: T,
): { [K in keyof T]: { description: string; inputSchema: JsonSchema } } {
  const result: Record<string, unknown> = {};
  for (const [key, tool] of Object.entries(tools)) {
    result[key] = {
      description: tool.description,
      inputSchema: tool.inputSchema,
    };
  }
  return result as never;
}
