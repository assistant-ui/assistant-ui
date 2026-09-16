import type { JSONSchema7 } from "json-schema";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
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
   *
   * Tools with backend-default parameters are always excluded.
   */
  filter?: (name: string, tool: Tool) => boolean;
};

const DRAFT_07_SCHEMA_IDS = new Set([
  "http://json-schema.org/draft-07/schema",
  "https://json-schema.org/draft-07/schema",
]);

function isStandardSchema(schema: unknown): schema is StandardSchemaV1 & {
  "~standard": StandardSchemaV1["~standard"] & {
    jsonSchema?: Partial<StandardJSONSchemaV1.Converter>;
  };
} {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "~standard" in schema &&
    typeof (schema as StandardSchemaV1)["~standard"] === "object"
  );
}

function hasToJSONSchemaMethod(schema: unknown): schema is {
  toJSONSchema: (options: StandardJSONSchemaV1.Options) => unknown;
} {
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
 * Narrows a converted schema to the dialect this module promises.
 *
 * Only `~standard.jsonSchema` and `toJSONSchema()` accept a target, so a
 * declared `$schema` is the one signal that tells whether the other paths, or a
 * converter that ignored the requested target, produced draft-07.
 */
function asDraft07(result: unknown): JSONSchema7 {
  if (typeof result === "object" && result !== null) {
    const declared = (result as { $schema?: unknown }).$schema;
    if (
      typeof declared === "string" &&
      !DRAFT_07_SCHEMA_IDS.has(declared.replace(/#$/, ""))
    ) {
      throw new Error(
        `Expected a draft-07 JSON Schema but the schema declares "${declared}". ` +
          "Convert it to draft-07 before passing it, " +
          "or use a schema library that implements Standard JSON Schema.",
      );
    }
  }

  return result as JSONSchema7;
}

/**
 * Converts a schema to JSONSchema7.
 * Supports:
 * - StandardSchemaV1 with ~standard.jsonSchema.input() (e.g., Zod v4)
 * - Objects with toJSONSchema() method
 * - Objects with toJSON() method
 * - Plain JSONSchema7 objects
 *
 * Converters that accept a target are asked for draft-07, and any result
 * declaring a different `$schema` dialect is rejected.
 */
export function toJSONSchema(
  schema: StandardSchemaV1 | JSONSchema7,
): JSONSchema7 {
  // StandardSchemaV1 with ~standard.jsonSchema.input()
  if (isStandardSchema(schema)) {
    const jsonSchema = schema["~standard"].jsonSchema;
    if (
      typeof jsonSchema === "object" &&
      jsonSchema !== null &&
      typeof jsonSchema.input === "function"
    ) {
      return asDraft07(jsonSchema.input({ target: "draft-07" }));
    }
  }

  // toJSONSchema method on the schema itself
  if (hasToJSONSchemaMethod(schema)) {
    return asDraft07(schema.toJSONSchema({ target: "draft-07" }));
  }

  // toJSON method on the schema
  if (hasToJSONMethod(schema)) {
    return asDraft07(schema.toJSON());
  }

  // If it's a Standard Schema that we couldn't convert, throw a helpful error
  if (isStandardSchema(schema)) {
    const { vendor } = schema["~standard"];
    throw new Error(
      `Could not convert the "${vendor}" schema to JSON Schema: ` +
        `it has no "~standard.jsonSchema" converter. Upgrade ${vendor} to a release ` +
        "that implements Standard JSON Schema, wrap the schema with that library's " +
        "Standard JSON Schema helper, or pass a plain JSON Schema object instead.",
    );
  }

  // Already a plain JSONSchema7
  return asDraft07(schema);
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
          return [key, toPartialJSONSchema(prop)];
        }
        return [key, prop];
      }),
    );
  }

  return result;
}

function defaultToolFilter(_name: string, tool: Tool): boolean {
  return (
    !tool.disabled &&
    tool.type !== "backend" &&
    (tool.type !== "frontend" || tool.execute !== undefined)
  );
}

function toolHasUploadableParameters(
  tool: Tool,
): tool is Tool & { parameters: NonNullable<Tool["parameters"]> } {
  return (
    tool.parameters !== undefined && !tool.unstable_backendDefault?.parameters
  );
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
      .filter(([name, tool]) => filter(name, tool))
      .filter(
        (
          entry,
        ): entry is [
          string,
          Tool & { parameters: NonNullable<Tool["parameters"]> },
        ] => toolHasUploadableParameters(entry[1]),
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
