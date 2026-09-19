import type { JSONSchema7, JSONSchema7Definition } from "json-schema";

// The converter does not pin a JSON Schema draft, so the 2020-12 applicators
// missing from the JSONSchema7 typings must be traversed as well.
type TraversableSchema = JSONSchema7 & {
  prefixItems?: JSONSchema7Definition[];
  dependentSchemas?: { [key: string]: JSONSchema7Definition };
  unevaluatedItems?: JSONSchema7Definition;
  unevaluatedProperties?: JSONSchema7Definition;
};

export function scopeSchema(schema: JSONSchema7, path: string) {
  let referenced = false;
  const visit = (definition: JSONSchema7Definition): JSONSchema7Definition => {
    if (typeof definition === "boolean") return definition;
    const schema = definition as TraversableSchema;
    const result = { ...schema };
    if (schema.$ref === "#" || schema.$ref?.startsWith("#/")) {
      referenced = true;
      result.$ref = path + schema.$ref.slice(1);
    }
    // Only schema-bearing keywords are traversed; defaults and examples are data.
    for (const key of [
      "properties",
      "patternProperties",
      "definitions",
      "$defs",
      "dependentSchemas",
    ] as const) {
      const entries = schema[key];
      if (entries)
        result[key] = Object.fromEntries(
          Object.entries(entries).map(([name, value]) => [name, visit(value)]),
        );
    }
    for (const key of ["allOf", "anyOf", "oneOf", "prefixItems"] as const) {
      if (schema[key]) result[key] = schema[key].map(visit);
    }
    for (const key of [
      "additionalProperties",
      "additionalItems",
      "unevaluatedProperties",
      "unevaluatedItems",
      "contains",
      "propertyNames",
      "not",
      "if",
      "then",
      "else",
    ] as const) {
      const value = schema[key];
      if (value !== undefined) result[key] = visit(value);
    }
    if (schema.items !== undefined)
      result.items = Array.isArray(schema.items)
        ? schema.items.map(visit)
        : visit(schema.items);
    if (schema.dependencies)
      result.dependencies = Object.fromEntries(
        Object.entries(schema.dependencies).map(([name, value]) => [
          name,
          Array.isArray(value) ? value : visit(value),
        ]),
      );
    return result;
  };
  const scoped = visit(schema) as JSONSchema7;
  return { schema: scoped, referenced };
}
