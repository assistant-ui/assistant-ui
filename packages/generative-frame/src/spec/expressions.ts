import { deepEqual } from "../json-schema";
import { evaluateFormula } from "./calc";
import { getAtPointer, joinPointer, parsePointer } from "./pointer";
import type { Condition } from "./types";

/** What expressions can read while an element renders or an action runs. */
export type ExpressionContext = {
  state: unknown;
  /** The current item and index inside a `repeat`. */
  item?: unknown;
  index?: number;
  /** The state path of the current item, so `$bindItem` can write back. */
  itemPath?: string;
  /** The payload an event was emitted with, for action params. */
  event?: unknown;
};

const SOURCE_KEYS = [
  "$state",
  "$bindState",
  "$item",
  "$bindItem",
  "$index",
  "$event",
] as const;
const EXPRESSION_KEYS = new Set<string>([
  ...SOURCE_KEYS,
  "$cond",
  "$calc",
  "$template",
]);
const COMPARATORS = ["eq", "neq", "gt", "gte", "lt", "lte"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** True for `{ $state }`, `{ $bindState }`, `{ $item }`, `{ $bindItem }`, `{ $index }`, `{ $event }`, `{ $cond }`, `{ $calc }`, and `{ $template }`. */
export const isExpression = (
  value: unknown,
): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).some((key) => EXPRESSION_KEYS.has(key));

/** True for a string that is only an expression key, such as `"$calc"`. */
export const isExpressionKey = (value: string) =>
  EXPRESSION_KEYS.has(value.trim());

const readPath = (base: unknown, path: unknown) =>
  typeof path === "string" && path !== ""
    ? getAtPointer(base, safeTokens(path))
    : base;

const safeTokens = (path: string) => {
  try {
    return parsePointer(path.startsWith("/") ? path : `/${path}`);
  } catch {
    return [];
  }
};

const readSource = (
  expression: Record<string, unknown>,
  ctx: ExpressionContext,
) => {
  if ("$state" in expression) return readPath(ctx.state, expression["$state"]);
  if ("$bindState" in expression)
    return readPath(ctx.state, expression["$bindState"]);
  if ("$item" in expression) return readPath(ctx.item, expression["$item"]);
  if ("$bindItem" in expression)
    return readPath(ctx.item, expression["$bindItem"]);
  if ("$index" in expression) return ctx.index;
  if ("$event" in expression) return readPath(ctx.event, expression["$event"]);
  return undefined;
};

const formatTemplateValue = (value: unknown) =>
  value === undefined || value === null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

/**
 * Fills `${/path}` (state), `${$item/path}`, `${$item}`, and `${$index}`
 * placeholders in a `$template` string.
 */
export function renderTemplate(
  template: string,
  ctx: ExpressionContext,
): string {
  const fill = (raw: string) => {
    const ref = raw.trim();
    if (ref === "$index") return formatTemplateValue(ctx.index);
    if (ref === "$item") return formatTemplateValue(ctx.item);
    if (ref.startsWith("$item/")) {
      return formatTemplateValue(readPath(ctx.item, ref.slice(5)));
    }
    return formatTemplateValue(readPath(ctx.state, ref));
  };
  let out = "";
  let from = 0;
  for (;;) {
    const start = template.indexOf("${", from);
    if (start === -1) break;
    const end = template.indexOf("}", start + 2);
    if (end === -1) break;
    out += template.slice(from, start) + fill(template.slice(start + 2, end));
    from = end + 1;
  }
  return out + template.slice(from);
}

/** Resolves expressions anywhere inside a value; plain values pass through. */
export function resolveValue(value: unknown, ctx: ExpressionContext): unknown {
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, ctx));
  if (!isRecord(value)) return value;
  if ("$cond" in value) {
    return evaluateCondition(value["$cond"] as Condition, ctx)
      ? resolveValue(value["$then"], ctx)
      : resolveValue(value["$else"], ctx);
  }
  if ("$calc" in value) {
    return typeof value["$calc"] === "string"
      ? evaluateFormula(value["$calc"], ctx)
      : null;
  }
  if ("$template" in value) {
    return typeof value["$template"] === "string"
      ? renderTemplate(value["$template"], ctx)
      : "";
  }
  if (SOURCE_KEYS.some((key) => key in value)) return readSource(value, ctx);
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = resolveValue(child, ctx);
  }
  return result;
}

const compare = (
  left: unknown,
  operator: (typeof COMPARATORS)[number],
  right: unknown,
) => {
  switch (operator) {
    case "eq":
      return deepEqual(left, right);
    case "neq":
      return !deepEqual(left, right);
    default: {
      if (
        !(typeof left === "number" && typeof right === "number") &&
        !(typeof left === "string" && typeof right === "string")
      ) {
        return false;
      }
      if (operator === "gt") return left > right;
      if (operator === "gte") return left >= right;
      if (operator === "lt") return left < right;
      return left <= right;
    }
  }
};

/**
 * Evaluates a visibility condition. Unknown shapes are false, so a
 * half-streamed condition hides its element rather than throwing.
 */
export function evaluateCondition(
  condition: Condition | undefined,
  ctx: ExpressionContext,
): boolean {
  return evaluateConditionValue(condition, ctx) ?? false;
}

function evaluateConditionValue(
  condition: Condition | undefined,
  ctx: ExpressionContext,
): boolean | undefined {
  if (condition === undefined) return true;
  if (typeof condition === "boolean") return condition;
  if (Array.isArray(condition)) {
    const values = condition.map((part) =>
      evaluateConditionValue(part as Condition, ctx),
    );
    return values.includes(false)
      ? false
      : values.includes(undefined)
        ? undefined
        : true;
  }
  if (!isRecord(condition)) return Boolean(condition);
  if (Array.isArray(condition["$and"])) {
    return evaluateConditionValue(condition["$and"] as Condition[], ctx);
  }
  if (Array.isArray(condition["$or"])) {
    const values = (condition["$or"] as Condition[]).map((part) =>
      evaluateConditionValue(part, ctx),
    );
    return values.includes(true)
      ? true
      : values.includes(undefined)
        ? undefined
        : false;
  }
  const hasSource = SOURCE_KEYS.some((key) => key in condition);
  if (!hasSource && "not" in condition) {
    const value = evaluateConditionValue(condition["not"] as Condition, ctx);
    return value === undefined ? undefined : !value;
  }
  if (!hasSource) {
    if (!isExpression(condition)) return undefined;
    let expression: unknown = condition;
    while (isRecord(expression) && "$cond" in expression) {
      const matches = evaluateConditionValue(
        expression["$cond"] as Condition,
        ctx,
      );
      if (matches === undefined) return undefined;
      expression = expression[matches ? "$then" : "$else"];
    }
    return Boolean(resolveValue(expression, ctx));
  }

  const value = readSource(condition, ctx);
  let result = true;
  let compared = false;
  for (const operator of COMPARATORS) {
    if (!(operator in condition)) continue;
    compared = true;
    result &&= compare(value, operator, resolveValue(condition[operator], ctx));
  }
  if (!compared) result = Boolean(value);
  return condition["not"] === true ? !result : result;
}

/** Resolved props plus the state path behind each two-way bound prop. */
export type ResolvedProps = {
  props: Record<string, unknown>;
  bindings: Record<string, string>;
};

const normalizePath = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

/**
 * Resolves an element's props. Top-level `$bindState` and `$bindItem` props
 * are also reported in `bindings`, so the component can write the value back.
 */
export function resolveProps(
  props: Record<string, unknown> | undefined,
  ctx: ExpressionContext,
): ResolvedProps {
  const resolved: Record<string, unknown> = {};
  const bindings: Record<string, string> = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    if (isRecord(value) && typeof value["$bindState"] === "string") {
      bindings[key] = normalizePath(value["$bindState"]);
    } else if (
      isRecord(value) &&
      typeof value["$bindItem"] === "string" &&
      ctx.itemPath !== undefined
    ) {
      const field = value["$bindItem"];
      bindings[key] = field
        ? `${ctx.itemPath}${normalizePath(field)}`
        : ctx.itemPath;
    }
    resolved[key] = resolveValue(value, ctx);
  }
  return { props: resolved, bindings };
}

/** The state path of item `index` in the array at `path`. */
export const itemPointer = (path: string, index: number) =>
  `${normalizePath(path) === "/" ? "" : normalizePath(path)}${joinPointer([index])}`;
