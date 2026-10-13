import type { ExpressionContext } from "./expressions";
import { getAtPointer, parsePointer } from "./pointer";

type Node =
  | { kind: "literal"; value: unknown }
  | { kind: "reference"; path: string }
  | { kind: "unary"; operator: string; operand: Node }
  | { kind: "binary"; operator: string; left: Node; right: Node }
  | { kind: "conditional"; condition: Node; then: Node; otherwise: Node }
  | { kind: "call"; name: string; args: Node[] };

type Token =
  | { kind: "literal"; value: unknown }
  | { kind: "reference" | "name" | "symbol"; text: string }
  | { kind: "end" };

type FormulaFunction = {
  min: number;
  max: number;
  run: (args: unknown[], step: () => void) => unknown;
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalize = (value: unknown): unknown =>
  value === undefined || (typeof value === "number" && !Number.isFinite(value))
    ? null
    : value;

const pointerTokens = (path: string) => {
  try {
    return parsePointer(path && !path.startsWith("/") ? `/${path}` : path);
  } catch {
    return [];
  }
};

const readPath = (base: unknown, path: string) =>
  getAtPointer(base, pointerTokens(path));

const readReference = (path: string, ctx: ExpressionContext) => {
  if (path === "$index") return ctx.index;
  if (path === "$item") return ctx.item;
  if (path.startsWith("$item/")) return readPath(ctx.item, path.slice(5));
  if (path === "$event") return ctx.event;
  if (path.startsWith("$event/")) return readPath(ctx.event, path.slice(6));
  return readPath(ctx.state, path);
};

const eachChild = (
  value: object,
  visit: (child: unknown, key: string) => boolean,
) => {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      if (Object.hasOwn(value, index) && !visit(value[index], String(index))) {
        return false;
      }
    }
    return true;
  }
  for (const key in value) {
    if (
      Object.hasOwn(value, key) &&
      !visit((value as Record<string, unknown>)[key], key)
    ) {
      return false;
    }
  }
  return true;
};

const visitAll = (value: unknown, step: () => void): void => {
  step();
  if (typeof value === "object" && value !== null) {
    eachChild(value, (child) => {
      visitAll(child, step);
      return true;
    });
  }
};

const formatText = (value: unknown, step: () => void) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  visitAll(value, step);
  return JSON.stringify(value);
};

const fractionDigits = (value: number) =>
  Math.max(0, Math.min(20, Math.trunc(value)));

const numeric =
  (fn: (...args: number[]) => number): FormulaFunction["run"] =>
  (args) =>
    args.every(isNumber) ? fn(...args) : null;

const aggregate = (
  operation: "sum" | "avg" | "min" | "max",
  args: unknown[],
  step: () => void,
) => {
  const [list, field] = args;
  if (!Array.isArray(list) || args.length > 2) return null;
  if (args.length === 2 && typeof field !== "string") return null;
  if (typeof field === "string" && field.length > 500) return null;
  const tokens = typeof field === "string" ? pointerTokens(field) : undefined;
  if (tokens && tokens.length > 32) return null;
  let total = 0;
  let count = 0;
  let extreme: number | null = null;
  for (const item of list) {
    step();
    const value = tokens ? getAtPointer(item, tokens) : item;
    if (!isNumber(value)) continue;
    total += value;
    count++;
    if (extreme === null) extreme = value;
    else if (operation === "min") extreme = Math.min(extreme, value);
    else if (operation === "max") extreme = Math.max(extreme, value);
  }
  if (operation === "sum") return total;
  if (operation === "avg") return count ? total / count : null;
  return extreme;
};

const formatters = new Map<string, Intl.NumberFormat>();

const formatNumber = (value: unknown, options: Intl.NumberFormatOptions) => {
  if (!isNumber(value)) return null;
  const key = JSON.stringify(options);
  let formatter = formatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-US", options);
    } catch {
      return null;
    }
    if (formatters.size >= 64) formatters.clear();
    formatters.set(key, formatter);
  }
  return formatter.format(value);
};

const decimalFormat = (args: unknown[], style: "decimal" | "percent") => {
  const [value, digits] = args;
  if (args.length === 1) return formatNumber(value, { style });
  if (!isNumber(digits)) return null;
  const precision = fractionDigits(digits);
  return formatNumber(value, {
    style,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

const functions = new Map<string, FormulaFunction>([
  [
    "round",
    {
      min: 1,
      max: 2,
      run: numeric((x, digits = 0) => {
        const scale = 10 ** fractionDigits(digits);
        return Math.round(x * scale) / scale;
      }),
    },
  ],
  ["floor", { min: 1, max: 1, run: numeric(Math.floor) }],
  ["ceil", { min: 1, max: 1, run: numeric(Math.ceil) }],
  ["abs", { min: 1, max: 1, run: numeric(Math.abs) }],
  [
    "clamp",
    {
      min: 3,
      max: 3,
      run: numeric((x, low, high) => Math.min(Math.max(x, low), high)),
    },
  ],
  ...(["min", "max"] as const).map((name): [string, FormulaFunction] => [
    name,
    {
      min: 1,
      max: Infinity,
      run: (args, step) =>
        Array.isArray(args[0])
          ? aggregate(name, args, step)
          : numeric(name === "min" ? Math.min : Math.max)(args, step),
    },
  ]),
  [
    "count",
    {
      min: 1,
      max: 1,
      run: ([list]) => (Array.isArray(list) ? list.length : null),
    },
  ],
  ...(["sum", "avg"] as const).map((name): [string, FormulaFunction] => [
    name,
    {
      min: 1,
      max: 2,
      run: (args, step) => aggregate(name, args, step),
    },
  ]),
  ["number", { min: 1, max: 2, run: (args) => decimalFormat(args, "decimal") }],
  [
    "currency",
    {
      min: 2,
      max: 2,
      run: ([value, code]) =>
        typeof code === "string"
          ? formatNumber(value, { style: "currency", currency: code })
          : null,
    },
  ],
  [
    "percent",
    { min: 1, max: 2, run: (args) => decimalFormat(args, "percent") },
  ],
  [
    "time",
    {
      min: 1,
      max: 1,
      run: ([value]) => {
        if (!isNumber(value)) return null;
        const minutes = ((Math.round(value) % 1440) + 1440) % 1440;
        const hour = Math.floor(minutes / 60);
        return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
      },
    },
  ],
  [
    "plural",
    { min: 3, max: 3, run: ([n, one, other]) => (n === 1 ? one : other) },
  ],
]);

const tokenize = (formula: string): Token[] => {
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < formula.length) {
    const char = formula[offset]!;
    if (/\s/.test(char)) {
      offset++;
    } else if (char === "'" || char === '"') {
      offset++;
      let value = "";
      while (offset < formula.length && formula[offset] !== char) {
        let next = formula[offset++]!;
        if (next === "\\") {
          next = formula[offset++] ?? "";
          if (next !== "\\" && next !== "'" && next !== '"') {
            throw new Error("Invalid string escape");
          }
        }
        value += next;
      }
      if (offset >= formula.length) throw new Error("Unterminated string");
      offset++;
      tokens.push({ kind: "literal", value });
    } else if (char === "$" && formula[offset + 1] === "{") {
      const end = formula.indexOf("}", offset + 2);
      if (end === -1) throw new Error("Unterminated reference");
      tokens.push({
        kind: "reference",
        text: formula.slice(offset + 2, end).trim(),
      });
      offset = end + 1;
    } else if (/[0-9]/.test(char)) {
      const start = offset++;
      while (/[0-9]/.test(formula[offset] ?? "")) offset++;
      if (formula[offset] === "." && /[0-9]/.test(formula[offset + 1] ?? "")) {
        offset++;
        while (/[0-9]/.test(formula[offset] ?? "")) offset++;
      }
      tokens.push({
        kind: "literal",
        value: Number(formula.slice(start, offset)),
      });
    } else if (/[a-zA-Z_]/.test(char)) {
      const start = offset++;
      while (/[a-zA-Z0-9_]/.test(formula[offset] ?? "")) offset++;
      const name = formula.slice(start, offset);
      if (name === "true" || name === "false" || name === "null") {
        tokens.push({
          kind: "literal",
          value: name === "null" ? null : name === "true",
        });
      } else tokens.push({ kind: "name", text: name });
    } else {
      const pair = formula.slice(offset, offset + 2);
      if (["||", "&&", "==", "!=", "<=", ">="].includes(pair)) {
        tokens.push({ kind: "symbol", text: pair });
        offset += 2;
      } else if ("?:<>+-*/%!(),".includes(char)) {
        tokens.push({ kind: "symbol", text: char });
        offset++;
      } else throw new Error(`Unexpected token "${char}"`);
    }
  }
  tokens.push({ kind: "end" });
  return tokens;
};

const precedence = [
  ["||"],
  ["&&"],
  ["==", "!="],
  ["<", "<=", ">", ">="],
  ["+", "-"],
  ["*", "/", "%"],
];

const parse = (formula: string): Node => {
  const tokens = tokenize(formula);
  let position = 0;
  const current = () => tokens[position]!;
  const match = (symbol: string) => {
    const token = current();
    if (token.kind !== "symbol" || token.text !== symbol) return false;
    position++;
    return true;
  };
  const expect = (symbol: string) => {
    if (!match(symbol)) throw new Error(`Expected "${symbol}"`);
  };
  const checkDepth = (depth: number) => {
    if (depth > 32) throw new Error("Formula exceeds 32 levels of nesting");
  };
  const primary = (depth: number): Node => {
    checkDepth(depth);
    const token = current();
    position++;
    if (token.kind === "literal") return token;
    if (token.kind === "reference")
      return { kind: "reference", path: token.text };
    if (token.kind === "symbol" && token.text === "(") {
      const node = conditional(depth + 1);
      expect(")");
      return node;
    }
    if (token.kind === "name") {
      const fn = functions.get(token.text);
      if (!fn) {
        throw new Error(
          `Unknown function "${token.text}"; known: ${[...functions.keys()].join(", ")}`,
        );
      }
      checkDepth(depth + 1);
      expect("(");
      const args: Node[] = [];
      if (!match(")")) {
        do {
          args.push(conditional(depth + 1));
        } while (match(","));
        expect(")");
      }
      if (args.length < fn.min || args.length > fn.max) {
        throw new Error(`Wrong argument count for "${token.text}"`);
      }
      return { kind: "call", name: token.text, args };
    }
    throw new Error("Expected a value");
  };
  const unary = (depth: number): Node => {
    checkDepth(depth);
    const token = current();
    if (token.kind === "symbol" && (token.text === "-" || token.text === "!")) {
      position++;
      return { kind: "unary", operator: token.text, operand: unary(depth + 1) };
    }
    return primary(depth);
  };
  const binary = (level: number, depth: number): Node => {
    const operators = precedence[level];
    if (!operators) return unary(depth);
    let left = binary(level + 1, depth);
    for (;;) {
      const token = current();
      if (token.kind !== "symbol" || !operators.includes(token.text))
        return left;
      position++;
      left = {
        kind: "binary",
        operator: token.text,
        left,
        right: binary(level + 1, depth),
      };
    }
  };
  const conditional = (depth: number): Node => {
    const condition = binary(0, depth);
    if (!match("?")) return condition;
    const then = conditional(depth + 1);
    expect(":");
    return {
      kind: "conditional",
      condition,
      then,
      otherwise: conditional(depth + 1),
    };
  };
  const node = conditional(0);
  if (current().kind !== "end") throw new Error("Unexpected trailing token");
  return node;
};

const parsedFormulas = new Map<string, Node | string>();

const parsedFormula = (formula: string): Node | string => {
  if (formula.length > 500) return "Formula exceeds 500 characters";
  const cached = parsedFormulas.get(formula);
  if (cached !== undefined) return cached;
  let result: Node | string;
  try {
    result = parse(formula);
  } catch (error) {
    result = error instanceof Error ? error.message : "Invalid formula";
  }
  if (parsedFormulas.size >= 500) parsedFormulas.clear();
  parsedFormulas.set(formula, result);
  return result;
};

const childCount = (value: object, step: () => void) => {
  let count = 0;
  eachChild(value, () => {
    step();
    count++;
    return true;
  });
  return count;
};

const equal = (a: unknown, b: unknown, step: () => void): boolean => {
  step();
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (childCount(a, step) !== childCount(b, step)) return false;
  return eachChild(a, (child, key) =>
    equal(child, (b as Record<string, unknown>)[key], step),
  );
};

const calculate = (
  operator: string,
  left: unknown,
  right: unknown,
  step: () => void,
): unknown => {
  if (operator === "==") return equal(left, right, step);
  if (operator === "!=") return !equal(left, right, step);
  if (
    operator === "+" &&
    (typeof left === "string" || typeof right === "string")
  ) {
    return formatText(left, step) + formatText(right, step);
  }
  if (["<", "<=", ">", ">="].includes(operator)) {
    if (
      !(typeof left === "number" && typeof right === "number") &&
      !(typeof left === "string" && typeof right === "string")
    )
      return false;
    if (operator === "<") return left < right;
    if (operator === "<=") return left <= right;
    if (operator === ">") return left > right;
    return left >= right;
  }
  if (!isNumber(left) || !isNumber(right)) return null;
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? null : left / right;
    case "%":
      return right === 0 ? null : left % right;
    default:
      return null;
  }
};

const evaluate = (
  node: Node,
  ctx: ExpressionContext,
  step: () => void,
): unknown => {
  step();
  const visit = (child: Node) => normalize(evaluate(child, ctx, step));
  switch (node.kind) {
    case "literal":
      return node.value;
    case "reference":
      return readReference(node.path, ctx);
    case "unary": {
      const value = visit(node.operand);
      return node.operator === "!" ? !value : isNumber(value) ? -value : null;
    }
    case "conditional":
      return visit(node.condition) ? visit(node.then) : visit(node.otherwise);
    case "call":
      return functions.get(node.name)!.run(node.args.map(visit), step);
    case "binary": {
      const left = visit(node.left);
      if (node.operator === "&&")
        return Boolean(left) && Boolean(visit(node.right));
      if (node.operator === "||")
        return Boolean(left) || Boolean(visit(node.right));
      return calculate(node.operator, left, visit(node.right), step);
    }
  }
};

/** Evaluates a bounded formula, returning null when it cannot run. */
export function evaluateFormula(
  formula: string,
  ctx: ExpressionContext,
): unknown {
  try {
    const node = parsedFormula(formula);
    if (typeof node === "string") return null;
    let steps = 0;
    return normalize(
      evaluate(node, ctx, () => {
        if (++steps > 10_000)
          throw new Error("Formula exceeds 10000 evaluation steps");
      }),
    );
  } catch {
    return null;
  }
}

/** Why a formula cannot run, or undefined when it parses within the bounds. */
export function formulaIssue(formula: string): string | undefined {
  const result = parsedFormula(formula);
  return typeof result === "string" ? result : undefined;
}
