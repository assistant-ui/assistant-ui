import { deepEqual } from "../json-schema";
import { getAtPointer, safePointerTokens } from "./pointer";

const MAX_FORMULA_LENGTH = 500;
const MAX_NESTING = 32;
const MAX_EVALUATION_STEPS = 10_000;
const PARSE_CACHE_LIMIT = 256;
const FORMATTER_CACHE_LIMIT = 32;

export type FormulaContext = {
  state: unknown;
  item?: unknown;
  index?: number;
  event?: unknown;
};

type Node =
  | { type: "literal"; value: unknown }
  | { type: "reference"; path: string }
  | { type: "unary"; operator: "-" | "!"; operand: Node }
  | { type: "binary"; operator: string; left: Node; right: Node }
  | { type: "conditional"; test: Node; yes: Node; no: Node }
  | { type: "call"; name: string; args: Node[] };

type ParseResult = { node: Node } | { error: string };

const knownFunctions = new Set([
  "round",
  "floor",
  "ceil",
  "abs",
  "min",
  "max",
  "clamp",
  "count",
  "sum",
  "avg",
  "number",
  "currency",
  "percent",
  "time",
  "plural",
]);

class FormulaSyntaxError extends Error {}
class EvaluationLimitError extends Error {}

class Parser {
  private offset = 0;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  parse(): Node {
    const result = this.parseConditional(0);
    this.skipWhitespace();
    if (this.offset !== this.source.length) {
      this.fail("Unexpected input");
    }
    return result;
  }

  private parseConditional(depth: number): Node {
    let test = this.parseOr(depth);
    if (this.consume("?")) {
      const nested = depth + 1;
      this.checkDepth(nested);
      const yes = this.parseConditional(nested);
      this.expect(":");
      const no = this.parseConditional(nested);
      test = { type: "conditional", test, yes, no };
    }
    return test;
  }

  private parseOr(depth: number): Node {
    let left = this.parseAnd(depth);
    while (this.consume("||")) {
      left = {
        type: "binary",
        operator: "||",
        left,
        right: this.parseAnd(depth),
      };
    }
    return left;
  }

  private parseAnd(depth: number): Node {
    let left = this.parseEquality(depth);
    while (this.consume("&&")) {
      left = {
        type: "binary",
        operator: "&&",
        left,
        right: this.parseEquality(depth),
      };
    }
    return left;
  }

  private parseEquality(depth: number): Node {
    let left = this.parseComparison(depth);
    for (;;) {
      const operator = this.consume("==")
        ? "=="
        : this.consume("!=")
          ? "!="
          : undefined;
      if (!operator) return left;
      left = {
        type: "binary",
        operator,
        left,
        right: this.parseComparison(depth),
      };
    }
  }

  private parseComparison(depth: number): Node {
    let left = this.parseAdditive(depth);
    for (;;) {
      const operator = ["<=", ">=", "<", ">"].find((candidate) =>
        this.consume(candidate),
      );
      if (!operator) return left;
      left = {
        type: "binary",
        operator,
        left,
        right: this.parseAdditive(depth),
      };
    }
  }

  private parseAdditive(depth: number): Node {
    let left = this.parseMultiplicative(depth);
    for (;;) {
      const operator = this.consume("+")
        ? "+"
        : this.consume("-")
          ? "-"
          : undefined;
      if (!operator) return left;
      left = {
        type: "binary",
        operator,
        left,
        right: this.parseMultiplicative(depth),
      };
    }
  }

  private parseMultiplicative(depth: number): Node {
    let left = this.parseUnary(depth);
    for (;;) {
      const operator = this.consume("*")
        ? "*"
        : this.consume("/")
          ? "/"
          : this.consume("%")
            ? "%"
            : undefined;
      if (!operator) return left;
      left = {
        type: "binary",
        operator,
        left,
        right: this.parseUnary(depth),
      };
    }
  }

  private parseUnary(depth: number): Node {
    const operator = this.consume("-")
      ? "-"
      : this.consume("!")
        ? "!"
        : undefined;
    if (!operator) return this.parsePrimary(depth);
    const nested = depth + 1;
    this.checkDepth(nested);
    return {
      type: "unary",
      operator,
      operand: this.parseUnary(nested),
    };
  }

  private parsePrimary(depth: number): Node {
    this.skipWhitespace();
    if (this.offset >= this.source.length) this.fail("Expected a value");
    const char = this.source[this.offset];

    if (char === "(") {
      const nested = depth + 1;
      this.checkDepth(nested);
      this.offset++;
      const value = this.parseConditional(nested);
      this.expect(")");
      return value;
    }
    if (char === "'" || char === '"') {
      return { type: "literal", value: this.parseString(char) };
    }
    if (this.source.startsWith("${", this.offset)) {
      this.offset += 2;
      const end = this.source.indexOf("}", this.offset);
      if (end === -1) this.fail("Unclosed reference");
      const path = this.source.slice(this.offset, end).trim();
      this.offset = end + 1;
      return { type: "reference", path };
    }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(
      this.source.slice(this.offset),
    );
    if (number) {
      this.offset += number[0].length;
      const value = Number(number[0]);
      if (!Number.isFinite(value)) this.fail("Numbers must be finite");
      return { type: "literal", value };
    }

    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(
      this.source.slice(this.offset),
    );
    if (identifier) {
      const name = identifier[0];
      this.offset += name.length;
      if (name === "true") return { type: "literal", value: true };
      if (name === "false") return { type: "literal", value: false };
      if (name === "null") return { type: "literal", value: null };
      this.skipWhitespace();
      if (!this.consume("(")) this.fail(`Unknown identifier "${name}"`);
      if (!knownFunctions.has(name)) this.fail(`Unknown function "${name}"`);
      const nested = depth + 1;
      this.checkDepth(nested);
      const args: Node[] = [];
      if (!this.consume(")")) {
        do {
          args.push(this.parseConditional(nested));
        } while (this.consume(","));
        this.expect(")");
      }
      this.checkArgumentCount(name, args.length);
      return { type: "call", name, args };
    }
    this.fail(
      "Expected a number, string, reference, or parenthesized expression",
    );
  }

  private parseString(quote: string): string {
    this.offset++;
    let result = "";
    while (this.offset < this.source.length) {
      const char = this.source[this.offset++]!;
      if (char === quote) return result;
      if (char !== "\\") {
        result += char;
        continue;
      }
      if (this.offset >= this.source.length)
        this.fail("Unclosed string escape");
      const escaped = this.source[this.offset++]!;
      switch (escaped) {
        case "n":
          result += "\n";
          break;
        case "r":
          result += "\r";
          break;
        case "t":
          result += "\t";
          break;
        case "b":
          result += "\b";
          break;
        case "f":
          result += "\f";
          break;
        case "u": {
          const hex = this.source.slice(this.offset, this.offset + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex))
            this.fail("Invalid Unicode escape");
          result += String.fromCharCode(Number.parseInt(hex, 16));
          this.offset += 4;
          break;
        }
        default:
          result += escaped;
      }
    }
    this.fail("Unclosed string");
  }

  private checkArgumentCount(name: string, count: number) {
    const [min, max] = (() => {
      switch (name) {
        case "round":
        case "number":
        case "percent":
        case "sum":
        case "avg":
          return [1, 2];
        case "floor":
        case "ceil":
        case "abs":
        case "count":
        case "time":
          return [1, 1];
        case "min":
        case "max":
          return [1, Number.POSITIVE_INFINITY];
        case "clamp":
          return [3, 3];
        case "currency":
          return [2, 2];
        case "plural":
          return [3, 3];
        default:
          return [0, 0];
      }
    })();
    if (count >= min && count <= max) return;
    const expected = min === max ? `${min}` : `${min} or more`;
    this.fail(
      `Function "${name}" expects ${expected} argument${min === 1 && max === 1 ? "" : "s"}`,
    );
  }

  private consume(token: string): boolean {
    this.skipWhitespace();
    if (!this.source.startsWith(token, this.offset)) return false;
    this.offset += token.length;
    return true;
  }

  private expect(token: string) {
    if (!this.consume(token)) this.fail(`Expected "${token}"`);
  }

  private skipWhitespace() {
    while (/\s/.test(this.source[this.offset] ?? "")) this.offset++;
  }

  private checkDepth(depth: number) {
    if (depth > MAX_NESTING) {
      this.fail(`Formula exceeds the ${MAX_NESTING}-level nesting limit`);
    }
  }

  private fail(message: string): never {
    throw new FormulaSyntaxError(`${message} at character ${this.offset + 1}`);
  }
}

const parseCache = new Map<string, ParseResult>();

const parseCached = (formula: string): ParseResult => {
  const cached = parseCache.get(formula);
  if (cached) {
    parseCache.delete(formula);
    parseCache.set(formula, cached);
    return cached;
  }
  if (formula.length > MAX_FORMULA_LENGTH) {
    return {
      error: `Formula exceeds the ${MAX_FORMULA_LENGTH}-character limit`,
    };
  }
  let result: ParseResult;
  try {
    result = { node: new Parser(formula).parse() };
  } catch (error) {
    result = {
      error: error instanceof Error ? error.message : "Invalid formula syntax",
    };
  }
  parseCache.set(formula, result);
  if (parseCache.size > PARSE_CACHE_LIMIT) {
    parseCache.delete(parseCache.keys().next().value!);
  }
  return result;
};

type Evaluation = { context: FormulaContext; steps: number };

const tick = (evaluation: Evaluation, count = 1) => {
  evaluation.steps += count;
  if (evaluation.steps > MAX_EVALUATION_STEPS) {
    throw new EvaluationLimitError();
  }
};

const finiteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const readReference = (path: string, context: FormulaContext): unknown => {
  let value: unknown;
  if (path === "") value = context.state;
  else if (path === "$index") value = context.index;
  else if (path === "$item") value = context.item;
  else if (path.startsWith("$item/")) {
    value = getAtPointer(context.item, safePointerTokens(path.slice(5)));
  } else if (path === "$event") value = context.event;
  else if (path.startsWith("$event/")) {
    value = getAtPointer(context.event, safePointerTokens(path.slice(6)));
  } else {
    value = getAtPointer(context.state, safePointerTokens(path));
  }
  return value;
};

const formatterCaches = {
  number: new Map<string, Intl.NumberFormat>(),
  dateTime: new Map<string, Intl.DateTimeFormat>(),
  plural: new Map<string, Intl.PluralRules>(),
};

const cachedFormatter = <T>(
  cache: Map<string, T>,
  key: string,
  create: () => T,
) => {
  const existing = cache.get(key);
  if (existing) {
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const formatter = create();
  cache.set(key, formatter);
  if (cache.size > FORMATTER_CACHE_LIMIT) {
    cache.delete(cache.keys().next().value!);
  }
  return formatter;
};

const numberFormatter = (key: string, options: Intl.NumberFormatOptions) =>
  cachedFormatter(
    formatterCaches.number,
    key,
    () => new Intl.NumberFormat("en-US", options),
  );

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value) ?? "";
    } catch {
      return "";
    }
  }
  return String(value);
};

const evaluateCall = (
  node: Extract<Node, { type: "call" }>,
  evaluation: Evaluation,
) => {
  const values = node.args.map((arg) => evaluate(arg, evaluation));
  const [first, second, third] = values;
  switch (node.name) {
    case "round": {
      if (!finiteNumber(first)) return null;
      const digits = node.args.length === 1 ? 0 : second;
      if (
        !finiteNumber(digits) ||
        !Number.isInteger(digits) ||
        digits < 0 ||
        digits > 20
      )
        return null;
      const scale = 10 ** digits;
      const result = Math.round(first * scale) / scale;
      return Number.isFinite(result) ? result : null;
    }
    case "floor":
      return finiteNumber(first) ? Math.floor(first) : null;
    case "ceil":
      return finiteNumber(first) ? Math.ceil(first) : null;
    case "abs":
      return finiteNumber(first) ? Math.abs(first) : null;
    case "min":
    case "max": {
      if (Array.isArray(first)) {
        if (
          values.length > 2 ||
          (node.args.length > 1 && typeof second !== "string")
        )
          return null;
        const list = projectList(
          first,
          second as string | undefined,
          evaluation,
        );
        if (!list || list.length === 0) return null;
        return node.name === "min" ? Math.min(...list) : Math.max(...list);
      }
      if (!values.every(finiteNumber)) return null;
      return node.name === "min"
        ? Math.min(...(values as number[]))
        : Math.max(...(values as number[]));
    }
    case "clamp":
      if (
        !finiteNumber(first) ||
        !finiteNumber(second) ||
        !finiteNumber(third) ||
        second > third
      )
        return null;
      return Math.min(Math.max(first, second), third);
    case "count":
      if (!Array.isArray(first)) return null;
      tick(evaluation, first.length);
      return first.length;
    case "sum":
    case "avg": {
      if (
        !Array.isArray(first) ||
        (node.args.length > 1 && typeof second !== "string")
      )
        return null;
      const list = projectList(first, second as string | undefined, evaluation);
      if (!list || (node.name === "avg" && list.length === 0)) return null;
      const total = list.reduce((sum, item) => sum + item, 0);
      if (!Number.isFinite(total)) return null;
      const result = node.name === "avg" ? total / list.length : total;
      return Number.isFinite(result) ? result : null;
    }
    case "number": {
      if (!finiteNumber(first)) return null;
      if (
        node.args.length > 1 &&
        (!finiteNumber(second) ||
          !Number.isInteger(second) ||
          second < 0 ||
          second > 20)
      )
        return null;
      const digits = node.args.length === 1 ? undefined : (second as number);
      const options =
        digits === undefined
          ? {}
          : { minimumFractionDigits: digits, maximumFractionDigits: digits };
      return numberFormatter(`number:${digits ?? "default"}`, options).format(
        first,
      );
    }
    case "currency": {
      if (!finiteNumber(first) || typeof second !== "string") return null;
      return numberFormatter(`currency:${second}`, {
        style: "currency",
        currency: second,
      }).format(first);
    }
    case "percent": {
      if (!finiteNumber(first)) return null;
      if (
        node.args.length > 1 &&
        (!finiteNumber(second) ||
          !Number.isInteger(second) ||
          second < 0 ||
          second > 20)
      )
        return null;
      const digits = node.args.length === 1 ? undefined : (second as number);
      const options: Intl.NumberFormatOptions = {
        style: "percent",
        ...(digits === undefined
          ? {}
          : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
      };
      return numberFormatter(`percent:${digits ?? "default"}`, options).format(
        first,
      );
    }
    case "time": {
      if (!finiteNumber(first)) return null;
      const minute = ((Math.floor(first) % 1440) + 1440) % 1440;
      const formatter = cachedFormatter(
        formatterCaches.dateTime,
        "time:en-US",
        () =>
          new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hourCycle: "h12",
            timeZone: "UTC",
          }),
      );
      return formatter.format(new Date(minute * 60_000));
    }
    case "plural": {
      if (
        !finiteNumber(first) ||
        typeof second !== "string" ||
        typeof third !== "string"
      )
        return null;
      const formatter = cachedFormatter(
        formatterCaches.plural,
        "plural:en-US",
        () => new Intl.PluralRules("en-US"),
      );
      return formatter.select(first) === "one" ? second : third;
    }
    default:
      return null;
  }
};

const projectList = (
  values: unknown[],
  field: string | undefined,
  evaluation: Evaluation,
): number[] | null => {
  const result: number[] = [];
  for (const value of values) {
    tick(evaluation);
    const projected =
      field === undefined
        ? value
        : getAtPointer(value, safePointerTokens(field));
    if (!finiteNumber(projected)) return null;
    result.push(projected);
  }
  return result;
};

const compare = (left: unknown, operator: string, right: unknown): boolean => {
  if (operator === "==") return deepEqual(left, right);
  if (operator === "!=") return !deepEqual(left, right);
  if (
    !(typeof left === "number" && typeof right === "number") &&
    !(typeof left === "string" && typeof right === "string")
  ) {
    return false;
  }
  if (operator === "<") return left < right;
  if (operator === "<=") return left <= right;
  if (operator === ">") return left > right;
  return left >= right;
};

const evaluate = (node: Node, evaluation: Evaluation): unknown => {
  tick(evaluation);
  switch (node.type) {
    case "literal":
      return node.value;
    case "reference":
      return readReference(node.path, evaluation.context);
    case "unary": {
      const value = evaluate(node.operand, evaluation);
      if (node.operator === "!") return !value;
      return finiteNumber(value) ? -value : null;
    }
    case "conditional":
      return evaluate(node.test, evaluation)
        ? evaluate(node.yes, evaluation)
        : evaluate(node.no, evaluation);
    case "binary": {
      const left = evaluate(node.left, evaluation);
      if (node.operator === "&&") {
        return Boolean(left) && Boolean(evaluate(node.right, evaluation));
      }
      if (node.operator === "||") {
        return Boolean(left) || Boolean(evaluate(node.right, evaluation));
      }
      const right = evaluate(node.right, evaluation);
      if (["==", "!=", "<", "<=", ">", ">="].includes(node.operator)) {
        return compare(left, node.operator, right);
      }
      if (
        node.operator === "+" &&
        (typeof left === "string" || typeof right === "string")
      ) {
        return asText(left) + asText(right);
      }
      if (!finiteNumber(left) || !finiteNumber(right)) return null;
      if ((node.operator === "/" || node.operator === "%") && right === 0)
        return null;
      const result =
        node.operator === "+"
          ? left + right
          : node.operator === "-"
            ? left - right
            : node.operator === "*"
              ? left * right
              : node.operator === "/"
                ? left / right
                : left % right;
      return Number.isFinite(result) ? result : null;
    }
    case "call":
      return evaluateCall(node, evaluation);
  }
};

const parseFormula = (formula: string): ParseResult => parseCached(formula);

export function formulaIssue(
  formula: unknown,
  context?: FormulaContext,
): string | undefined {
  if (typeof formula !== "string") return "$calc must be a formula string";
  const parsed = parseFormula(formula);
  if ("error" in parsed) return parsed.error;
  if (context) {
    try {
      evaluate(parsed.node, { context, steps: 0 });
    } catch (error) {
      if (error instanceof EvaluationLimitError) {
        return `Formula exceeds the ${MAX_EVALUATION_STEPS}-step evaluation limit`;
      }
    }
  }
  return undefined;
}

export function evaluateFormula(
  formula: unknown,
  context: FormulaContext,
): unknown {
  if (typeof formula !== "string") return null;
  const parsed = parseFormula(formula);
  if ("error" in parsed) return null;
  try {
    const result = evaluate(parsed.node, { context, steps: 0 });
    return result === undefined ||
      (typeof result === "number" && !Number.isFinite(result))
      ? null
      : result;
  } catch {
    return null;
  }
}
