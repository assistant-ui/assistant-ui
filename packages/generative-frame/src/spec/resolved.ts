import {
  toJsonSchema,
  validateSchema,
  type JsonSchema,
  type SchemaIssue,
} from "../json-schema";
import type { PropsSchema } from "./catalog";
import { isExpression } from "./expressions";
import { getAtPointer, parsePointer } from "./pointer";

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

/** True when the value at `tokens` in `source` comes from an expression. */
function fromExpression(source: unknown, tokens: readonly string[]): boolean {
  let current = source;
  for (const token of tokens) {
    if (isExpression(current)) return true;
    if (
      typeof current !== "object" ||
      current === null ||
      !Object.hasOwn(current, token)
    ) {
      return false;
    }
    current = (current as Record<string, unknown>)[token];
  }
  return isExpression(current);
}

const issueTokens = (path: string) => {
  try {
    return parsePointer(path === "/" ? "" : path);
  } catch {
    return [];
  }
};

const containsExpression = (value: unknown): boolean =>
  isExpression(value) ||
  (typeof value === "object" &&
    value !== null &&
    Object.values(value).some(containsExpression));

/**
 * Validates values resolved from `source` against `schema`. Spec validation
 * skips expressions, so when `source` has any, the resolved values are
 * checked here with nothing skipped. A value an expression resolved to
 * `undefined`, such as state that is not set yet, is not an issue.
 */
export function resolvedIssues(
  schema: PropsSchema | undefined,
  resolved: Record<string, unknown>,
  source: unknown,
): SchemaIssue[] {
  if (!schema || !containsExpression(source)) return [];
  return validateSchema(schema, resolved).filter((issue) => {
    const tokens = issueTokens(issue.path);
    return !(
      tokens.length > 0 &&
      getAtPointer(resolved, tokens) === undefined &&
      fromExpression(source, tokens)
    );
  });
}

const describeIssue = (issue: SchemaIssue) =>
  `${issue.path === "/" ? "props" : issue.path.slice(1)} ${issue.message}`;

/**
 * Why an element's resolved props cannot render, or undefined. Expressions
 * are skipped when a spec is validated, so their resolved values are checked
 * here.
 */
export function rejectedPropType(
  schema: PropsSchema | undefined,
  props: Record<string, unknown>,
  source?: Record<string, unknown>,
): string | undefined {
  const properties = toJsonSchema(schema)?.properties;
  if (properties) {
    for (const [name, property] of Object.entries(properties)) {
      const value = props[name];
      if (value === null || typeof value !== "object") continue;
      const expected = expectedPrimitive(property);
      if (expected) {
        return `${name} expected ${expected}, got ${Array.isArray(value) ? "array" : "object"}`;
      }
    }
  }
  const issues = resolvedIssues(schema, props, source ?? {});
  return issues.length
    ? issues.slice(0, 2).map(describeIssue).join("; ")
    : undefined;
}
