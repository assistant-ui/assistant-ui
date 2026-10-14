import { toJsonSchema, type JsonSchema } from "../json-schema";
import type { PropsSchema } from "./catalog";

const primitiveTypes = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "null",
]);
const listedValues = "one of the listed values";

function expectedPrimitive(schema: JsonSchema): string | undefined {
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    return types.length > 0 && types.every((type) => primitiveTypes.has(type))
      ? [...new Set(types)].join(" or ")
      : undefined;
  }
  const alternatives = schema.anyOf ?? schema.oneOf;
  if (alternatives !== undefined) {
    if (alternatives.length === 0) return undefined;
    const expected = alternatives.map(expectedPrimitive);
    return expected.every((type): type is string => type !== undefined)
      ? [...new Set(expected)].join(" or ")
      : undefined;
  }
  if (schema.enum?.length) {
    return schema.enum.every(
      (value) => value === null || typeof value !== "object",
    )
      ? listedValues
      : undefined;
  }
  return undefined;
}

export function rejectedPropType(
  schema: PropsSchema | undefined,
  props: Record<string, unknown>,
): string | undefined {
  const properties = toJsonSchema(schema)?.properties;
  if (!properties) return undefined;
  for (const [name, property] of Object.entries(properties)) {
    const value = props[name];
    if (value === null || typeof value !== "object") continue;
    const expected = expectedPrimitive(property);
    if (expected) {
      return `${name} expected ${expected}, got ${Array.isArray(value) ? "array" : "object"}`;
    }
  }
  return undefined;
}
