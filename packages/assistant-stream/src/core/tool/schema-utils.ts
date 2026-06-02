import type { JSONSchema7 } from "json-schema";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ProviderOptions, Tool } from "./tool-types";

/**
 * Type for a tool definition with JSON Schema parameters.
 */
export type ToolJSONSchema = {
  description?: string;
  parameters: JSONSchema7;
  providerOptions?: ProviderOptions;
};

export type ToToolsJSONSchemaOptions = {
  /**
   * Filter to determine which tools to include.
   * Defaults to excluding disabled tools and backend tools.
   */
  filter?: (name: string, tool: Tool) => boolean;
};

function isStandardSchema(schema: unknown): schema is StandardSchemaV1 & {
  "~standard": StandardSchemaV1["~standard"] & {
    toJSONSchema?: () => unknown;
    jsonSchema?: { input?: () => unknown; output?: () => unknown };
  };
} {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "~standard" in schema &&
    typeof (schema as StandardSchemaV1)["~standard"] === "object"
  );
}

function hasToJSONSchemaMethod(
  schema: unknown,
): schema is { toJSONSchema: () => unknown } {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "toJSONSchema" in schema &&
    typeof (schema as { toJSONSchema: unknown }).toJSONSchema === "function"
  );
}

function hasToJSONMethod(schema: unknown): schema is { toJSON: () => unknown } {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "toJSON" in schema &&
    typeof (schema as { toJSON: unknown }).toJSON === "function"
  );
}

/**
 * Converts a schema to JSONSchema7.
 * Supports:
 * - StandardSchemaV1 with ~standard.toJSONSchema (e.g., Zod v4)
 * - StandardSchemaV1 with ~standard.jsonSchema.input() (e.g., Zod v4)
 * - Objects with toJSONSchema() method (e.g., Zod v4)
 * - Objects with toJSON() method
 * - Plain JSONSchema7 objects (must have a "type" property)
 */
export function toJSONSchema(
  schema: StandardSchemaV1 | JSONSchema7,
): JSONSchema7 {
  // StandardSchemaV1 with ~standard.toJSONSchema (e.g., Zod v4)
  if (isStandardSchema(schema)) {
    const toJSONSchemaMethod = schema["~standard"].toJSONSchema;
    if (typeof toJSONSchemaMethod === "function") {
      return toJSONSchemaMethod() as JSONSchema7;
    }

    // StandardSchemaV1 with ~standard.jsonSchema.input()
    const jsonSchema = schema["~standard"].jsonSchema;
    if (
      typeof jsonSchema === "object" &&
      jsonSchema !== null &&
      typeof jsonSchema.input === "function"
    ) {
      return jsonSchema.input() as JSONSchema7;
    }
  }

  // toJSONSchema method on the schema itself
  if (hasToJSONSchemaMethod(schema)) {
    return schema.toJSONSchema() as JSONSchema7;
  }

  // toJSON method on the schema
  if (hasToJSONMethod(schema)) {
    return schema.toJSON() as JSONSchema7;
  }

  // If it's a Standard Schema that we couldn't convert, throw a helpful error
  if (isStandardSchema(schema)) {
    throw new Error(
      "Could not convert schema to JSON Schema. " +
        "The schema implements Standard Schema but does not support JSON Schema conversion. " +
        "If you are using Zod, please upgrade to Zod v4 (npm install zod@latest). " +
        "Alternatively, pass a plain JSON Schema object instead.",
    );
  }

  // Already a plain JSONSchema7
  return schema as JSONSchema7;
}

/**
 * Returns a copy of the JSON Schema with `required` removed recursively,
 * making every property optional. Array item schemas are left unchanged.
 */
export function toPartialJSONSchema(schema: JSONSchema7): JSONSchema7 {
  const { required: _, ...result } = schema;

  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([key, prop]) => {
        if (typeof prop === "object" && prop !== null && !Array.isArray(prop)) {
          const p = prop as JSONSchema7;
          return [key, p.properties != null ? toPartialJSONSchema(p) : prop];
        }
        return [key, prop];
      }),
    );
  }

  return result;
}

function defaultToolFilter(_name: string, tool: Tool): boolean {
  return !tool.disabled && tool.type !== "backend";
}

function toolHasUploadableFields(tool: Tool): boolean {
  return (
    tool.parameters !== undefined && !tool.unstable_backendDefault?.parameters
  );
}

function toolHasUploadableParameters(
  tool: Tool,
): tool is Tool & { parameters: NonNullable<Tool["parameters"]> } {
  return toolHasUploadableFields(tool);
}

/**
 * Converts a record of tools to a record of tool definitions with JSON Schema parameters.
 * By default, filters out disabled tools and backend tools.
 *
 * Entries are emitted in alphabetical order so the resulting request body is
 * byte-identical regardless of the order in which tools were registered. This
 * keeps provider prompt caches stable across renders that mount tools in
 * different orders.
 */
export function toToolsJSONSchema(
  tools: Record<string, Tool> | undefined,
  options: ToToolsJSONSchemaOptions = {},
): Record<string, ToolJSONSchema> {
  if (!tools) return {};

  const filter = options.filter ?? defaultToolFilter;

  return Object.fromEntries(
    Object.entries(tools)
      .filter(
        (
          entry,
        ): entry is [
          string,
          Tool & { parameters: NonNullable<Tool["parameters"]> },
        ] =>
          filter(entry[0], entry[1]) && toolHasUploadableParameters(entry[1]),
      )
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, tool]) => [
        name,
        {
          ...(tool.description && { description: tool.description }),
          parameters: toJSONSchema(tool.parameters),
          ...(tool.providerOptions && {
            providerOptions: tool.providerOptions,
          }),
        },
      ]),
  );
}
