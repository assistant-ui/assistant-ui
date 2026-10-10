import type { JSONSchema7, JSONSchema7Definition } from "json-schema";

// The converter does not pin a JSON Schema draft, so the 2020-12 applicators
// missing from the JSONSchema7 typings must be traversed as well.
type TraversableSchema = JSONSchema7 & {
  prefixItems?: JSONSchema7Definition[];
  dependentSchemas?: { [key: string]: JSONSchema7Definition };
  unevaluatedItems?: JSONSchema7Definition;
  unevaluatedProperties?: JSONSchema7Definition;
  contentSchema?: JSONSchema7Definition;
};

/**
 * Copies a schema with each direct subschema replaced by `visit(subschema)`.
 * Only schema-bearing keywords are traversed; defaults and examples are data.
 */
export function mapSubschemas(
  schema: JSONSchema7,
  visit: (definition: JSONSchema7Definition) => JSONSchema7Definition,
): JSONSchema7 {
  const source = schema as TraversableSchema;
  const result: TraversableSchema = { ...source };
  for (const key of [
    "properties",
    "patternProperties",
    "definitions",
    "$defs",
    "dependentSchemas",
  ] as const) {
    const entries = source[key];
    if (entries)
      result[key] = Object.fromEntries(
        Object.entries(entries).map(([name, value]) => [name, visit(value)]),
      );
  }
  for (const key of ["allOf", "anyOf", "oneOf", "prefixItems"] as const) {
    if (source[key]) result[key] = source[key].map(visit);
  }
  for (const key of [
    "additionalProperties",
    "additionalItems",
    "unevaluatedProperties",
    "unevaluatedItems",
    "contentSchema",
    "contains",
    "propertyNames",
    "not",
    "if",
    "then",
    "else",
  ] as const) {
    const value = source[key];
    if (value !== undefined) result[key] = visit(value);
  }
  if (source.items !== undefined)
    result.items = Array.isArray(source.items)
      ? source.items.map(visit)
      : visit(source.items);
  if (source.dependencies)
    result.dependencies = Object.fromEntries(
      Object.entries(source.dependencies).map(([name, value]) => [
        name,
        Array.isArray(value) ? value : visit(value),
      ]),
    );
  return result;
}

export function scopeSchema(schema: JSONSchema7, path: string) {
  let referenced = false;
  const visit = (definition: JSONSchema7Definition): JSONSchema7Definition => {
    if (typeof definition === "boolean") return definition;
    const result = mapSubschemas(definition, visit);
    if (definition.$ref === "#" || definition.$ref?.startsWith("#/")) {
      referenced = true;
      result.$ref = path + definition.$ref.slice(1);
    }
    return result;
  };
  const scoped = visit(schema) as JSONSchema7;
  return { schema: scoped, referenced };
}
