/** The JSON Schema subset this package writes and validates. */
export type JsonSchema = {
  type?: JsonSchemaType | readonly JsonSchemaType[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  items?: JsonSchema;
  enum?: readonly unknown[];
  const?: unknown;
  anyOf?: readonly JsonSchema[];
  oneOf?: readonly JsonSchema[];
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean | JsonSchema;
  default?: unknown;
};

export type JsonSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

/** A validation failure at a JSON Pointer inside the validated value. */
export type SchemaIssue = { path: string; message: string };

/** The parts of a Standard Schema (https://standardschema.dev) this package uses. */
export type StandardSchemaLike = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardResult | Promise<StandardResult>;
    readonly jsonSchema?: {
      readonly input: (options: { target: string }) => Record<string, unknown>;
    };
  };
};

type StandardResult = {
  readonly issues?: ReadonlyArray<{
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
  }>;
};

export const isStandardSchema = (value: unknown): value is StandardSchemaLike =>
  typeof value === "object" &&
  value !== null &&
  "~standard" in value &&
  typeof (value as StandardSchemaLike)["~standard"]?.validate === "function";

/** JSON Schema for a schema that is either JSON Schema or a Standard Schema exposing one. */
export const toJsonSchema = (
  schema: JsonSchema | StandardSchemaLike | undefined,
): JsonSchema | undefined => {
  if (!schema) return undefined;
  if (!isStandardSchema(schema)) return schema;
  try {
    return schema["~standard"].jsonSchema?.input({
      target: "draft-2020-12",
    }) as JsonSchema | undefined;
  } catch {
    return undefined;
  }
};

const escapeToken = (token: string | number) =>
  String(token).replace(/~/g, "~0").replace(/\//g, "~1");

const typeOf = (value: unknown): JsonSchemaType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number")
    return Number.isInteger(value) ? "integer" : "number";
  return typeof value as JsonSchemaType;
};

const matchesType = (value: unknown, type: JsonSchemaType) => {
  const actual = typeOf(value);
  if (type === "number") return actual === "number" || actual === "integer";
  return actual === type;
};

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return (
    keysA.length === keysB.length &&
    keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    )
  );
};

export { deepEqual };

export type ValidateOptions = {
  /** Values for which this returns true are accepted without checking, e.g. expressions. */
  skip?: (value: unknown) => boolean;
};

/**
 * Validates a value against the JSON Schema subset above and returns every
 * issue found. Keywords outside the subset are ignored.
 */
export function validateJsonSchema(
  schema: JsonSchema,
  value: unknown,
  options: ValidateOptions = {},
  path = "",
): SchemaIssue[] {
  if (options.skip?.(value)) return [];
  const issues: SchemaIssue[] = [];
  const at = path || "/";

  if (schema.anyOf || schema.oneOf) {
    const branches = (schema.anyOf ?? schema.oneOf)!;
    const passes = branches.some(
      (branch) => validateJsonSchema(branch, value, options, path).length === 0,
    );
    if (!passes) {
      issues.push({ path: at, message: "does not match any allowed shape" });
      return issues;
    }
  }

  if (schema.type !== undefined) {
    const types = typeof schema.type === "string" ? [schema.type] : schema.type;
    if (!types.some((type) => matchesType(value, type))) {
      issues.push({
        path: at,
        message: `expected ${types.join(" or ")}, got ${typeOf(value)}`,
      });
      return issues;
    }
  }

  if (schema.const !== undefined && !deepEqual(schema.const, value)) {
    issues.push({
      path: at,
      message: `must be ${JSON.stringify(schema.const)}`,
    });
  }
  if (schema.enum && !schema.enum.some((option) => deepEqual(option, value))) {
    issues.push({
      path: at,
      message: `must be one of ${schema.enum.map((o) => JSON.stringify(o)).join(", ")}`,
    });
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({
        path: at,
        message: `must be at least ${schema.minLength} characters`,
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      issues.push({
        path: at,
        message: `must be at most ${schema.maxLength} characters`,
      });
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      issues.push({ path: at, message: `must be >= ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      issues.push({ path: at, message: `must be <= ${schema.maximum}` });
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      issues.push({
        path: at,
        message: `must have at least ${schema.minItems} items`,
      });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      issues.push({
        path: at,
        message: `must have at most ${schema.maxItems} items`,
      });
    }
    if (schema.items) {
      value.forEach((item, index) =>
        issues.push(
          ...validateJsonSchema(
            schema.items!,
            item,
            options,
            `${path}/${index}`,
          ),
        ),
      );
    }
  }

  if (typeOf(value) === "object") {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (record[key] === undefined) {
        issues.push({
          path: `${path}/${escapeToken(key)}`,
          message: "is required",
        });
      }
    }
    for (const [key, child] of Object.entries(record)) {
      const childPath = `${path}/${escapeToken(key)}`;
      const childSchema = schema.properties?.[key];
      if (childSchema) {
        if (child !== undefined) {
          issues.push(
            ...validateJsonSchema(childSchema, child, options, childPath),
          );
        }
      } else if (schema.additionalProperties === false) {
        issues.push({ path: childPath, message: "is not an allowed property" });
      } else if (typeof schema.additionalProperties === "object") {
        issues.push(
          ...validateJsonSchema(
            schema.additionalProperties,
            child,
            options,
            childPath,
          ),
        );
      }
    }
  }

  return issues;
}

const containsSkipped = (
  value: unknown,
  skip: (value: unknown) => boolean,
): boolean =>
  skip(value) ||
  (typeof value === "object" &&
    value !== null &&
    Object.values(value).some((child) => containsSkipped(child, skip)));

/**
 * Validates against JSON Schema or a Standard Schema. A Standard Schema that
 * validates asynchronously is not awaited and reports no issues, and neither
 * does one whose value contains a skipped placeholder.
 */
export function validateSchema(
  schema: JsonSchema | StandardSchemaLike,
  value: unknown,
  options: ValidateOptions = {},
): SchemaIssue[] {
  if (!isStandardSchema(schema)) {
    return validateJsonSchema(schema, value, options);
  }
  // A Standard Schema cannot be told to accept placeholders, so values that
  // contain one are left to the component.
  if (options.skip && containsSkipped(value, options.skip)) return [];
  const result = schema["~standard"].validate(value);
  if (result instanceof Promise) return [];
  return (result.issues ?? []).map((issue) => ({
    path:
      (issue.path ?? [])
        .map(
          (segment) =>
            `/${escapeToken(
              String(
                typeof segment === "object" && segment !== null
                  ? segment.key
                  : segment,
              ),
            )}`,
        )
        .join("") || "/",
    message: issue.message,
  }));
}

const describeType = (
  schema: JsonSchema | undefined,
  depth: number,
): string => {
  if (!schema) return "unknown";
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((o) => JSON.stringify(o)).join(" | ");
  const branches = schema.anyOf ?? schema.oneOf;
  if (branches) return branches.map((b) => describeType(b, depth)).join(" | ");
  const types =
    schema.type === undefined
      ? []
      : typeof schema.type === "string"
        ? [schema.type]
        : [...schema.type];
  if (types.length > 1) {
    return types
      .map((type) => describeType({ ...schema, type }, depth))
      .join(" | ");
  }
  switch (types[0]) {
    case "integer":
      return "integer";
    case "array":
      return `${describeType(schema.items, depth)}[]`.replace(
        /^(.* \| .*)\[\]$/,
        "($1)[]",
      );
    case "object":
      return schema.properties && depth < 3
        ? describeObject(schema, depth + 1)
        : "object";
    case undefined:
      return schema.properties ? describeObject(schema, depth + 1) : "unknown";
    default:
      return types[0];
  }
};

const describeObject = (schema: JsonSchema, depth: number): string => {
  const required = new Set(schema.required ?? []);
  const fields = Object.entries(schema.properties ?? {}).map(
    ([key, child]) =>
      `${key}${required.has(key) ? "" : "?"}: ${describeType(child, depth)}`,
  );
  return fields.length ? `{ ${fields.join("; ")} }` : "{}";
};

/** A compact TypeScript-like rendering of a schema, for prompts. */
export const describeSchema = (schema: JsonSchema | undefined): string =>
  describeType(schema, 0);
