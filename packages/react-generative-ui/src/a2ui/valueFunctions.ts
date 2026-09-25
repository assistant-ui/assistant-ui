const MAX_TEMPLATE_LENGTH = 10_000;
const MAX_TEMPLATE_PARTS = 1_000;
const MAX_EXPRESSION_DEPTH = 32;

export type ExpressionPart =
  | string
  | number
  | boolean
  | null
  | { readonly path: string }
  | { readonly call: string; readonly args: Record<string, ExpressionPart> };

export type ValueFunctionContext = {
  readonly resolve: (value: ExpressionPart) => unknown;
  readonly warn: (message: string) => void;
};

export class ExpressionSyntaxError extends Error {}

const FUNCTION_NAME = /^[A-Za-z_@]\w*$/;

const isSpace = (character: string) =>
  character === " " ||
  character === "\t" ||
  character === "\n" ||
  character === "\r";

const isPathCharacter = (character: string) =>
  !isSpace(character) && !"{}(),:'\"$".includes(character);

const isDigit = (character: string | undefined) =>
  character !== undefined && character >= "0" && character <= "9";

class ExpressionReader {
  private readonly text: string;
  position: number;

  constructor(text: string, position: number) {
    this.text = text;
    this.position = position;
  }

  expression(depth: number): ExpressionPart {
    if (depth > MAX_EXPRESSION_DEPTH) this.fail("it nests too deeply");
    this.skipSpace();
    const character = this.text[this.position];
    if (this.text.startsWith("${", this.position)) {
      this.position += 2;
      const value = this.expression(depth + 1);
      this.skipSpace();
      if (this.text[this.position] !== "}") {
        this.fail(
          this.position >= this.text.length
            ? "an interpolation is not closed"
            : "characters follow a complete expression",
        );
      }
      this.position++;
      return value;
    }
    if (character === "'" || character === '"') return this.string(character);
    if (
      isDigit(character) ||
      (character === "-" && isDigit(this.text[this.position + 1]))
    ) {
      return this.number();
    }
    const word = this.word();
    if (word === "") this.fail("an expression is missing");
    const end = this.position;
    this.skipSpace();
    if (this.text[this.position] === "(") {
      if (!FUNCTION_NAME.test(word)) this.fail(`"${word}" is not a function`);
      this.position++;
      return { call: word, args: this.arguments(depth) };
    }
    this.position = end;
    if (word === "true") return true;
    if (word === "false") return false;
    if (word === "null") return null;
    return { path: word };
  }

  private arguments(depth: number): Record<string, ExpressionPart> {
    const args: Record<string, ExpressionPart> = {};
    this.skipSpace();
    if (this.text[this.position] === ")") {
      this.position++;
      return args;
    }
    for (;;) {
      this.skipSpace();
      const name = this.word();
      if (!FUNCTION_NAME.test(name)) this.fail("an argument name is missing");
      this.skipSpace();
      if (this.text[this.position] !== ":") {
        this.fail(`argument "${name}" has no colon`);
      }
      this.position++;
      Object.defineProperty(args, name, {
        value: this.expression(depth + 1),
        enumerable: true,
        configurable: true,
        writable: true,
      });
      this.skipSpace();
      const separator = this.text[this.position];
      this.position++;
      if (separator === ")") return args;
      if (separator !== ",") {
        this.fail(
          separator === undefined
            ? "a function call is not closed"
            : "arguments are not separated by commas",
        );
      }
    }
  }

  private string(quote: string): string {
    let value = "";
    this.position++;
    for (;;) {
      const character = this.text[this.position++];
      if (character === undefined) this.fail("a string is not closed");
      if (character === quote) return value;
      if (character !== "\\") {
        value += character;
        continue;
      }
      const escaped = this.text[this.position++];
      if (escaped === undefined) this.fail("a string is not closed");
      value +=
        escaped === "n"
          ? "\n"
          : escaped === "t"
            ? "\t"
            : escaped === "r"
              ? "\r"
              : escaped;
    }
  }

  private number(): number {
    const start = this.position;
    if (this.text[this.position] === "-") this.position++;
    while (isDigit(this.text[this.position])) this.position++;
    if (this.text[this.position] === ".") {
      this.position++;
      while (isDigit(this.text[this.position])) this.position++;
    }
    const next = this.text[this.position];
    if (next !== undefined && isPathCharacter(next)) {
      this.fail("a number is malformed");
    }
    return Number(this.text.slice(start, this.position));
  }

  private word(): string {
    const start = this.position;
    while (
      this.position < this.text.length &&
      isPathCharacter(this.text[this.position]!)
    ) {
      this.position++;
    }
    return this.text.slice(start, this.position);
  }

  private skipSpace() {
    while (
      this.position < this.text.length &&
      isSpace(this.text[this.position]!)
    ) {
      this.position++;
    }
  }

  private fail(reason: string): never {
    throw new ExpressionSyntaxError(reason);
  }
}

export const parseExpressionTemplate = (template: string): ExpressionPart[] => {
  if (template.length > MAX_TEMPLATE_LENGTH) {
    throw new ExpressionSyntaxError(
      `it is longer than ${MAX_TEMPLATE_LENGTH} characters`,
    );
  }
  const parts: ExpressionPart[] = [];
  const push = (part: ExpressionPart) => {
    if (parts.length >= MAX_TEMPLATE_PARTS) {
      throw new ExpressionSyntaxError(
        `it has more than ${MAX_TEMPLATE_PARTS} parts`,
      );
    }
    parts.push(part);
  };
  let literal = "";
  let index = 0;
  while (index < template.length) {
    if (template.startsWith("\\${", index)) {
      literal += "${";
      index += 3;
    } else if (template.startsWith("${", index)) {
      if (literal) push(literal);
      literal = "";
      const reader = new ExpressionReader(template, index);
      push(reader.expression(0));
      index = reader.position;
    } else {
      literal += template[index];
      index++;
    }
  }
  if (literal) push(literal);
  return parts;
};

const isMissing = (value: unknown) =>
  value === undefined || value === null || value === "";

const toNumber = (value: unknown): number | undefined => {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const toDate = (value: unknown): Date | undefined => {
  if (typeof value === "number") return new Date(value);
  if (typeof value !== "string") return undefined;
  const dateOnly = DATE_ONLY.exec(value);
  if (!dateOnly) return new Date(value);
  const date = new Date(0);
  date.setFullYear(
    Number(dateOnly[1]),
    Number(dateOnly[2]) - 1,
    Number(dateOnly[3]),
  );
  date.setHours(0, 0, 0, 0);
  return date;
};

const toText = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "object") return String(value);
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
};

const cached = <T>(cache: Map<string, T>, key: string, create: () => T): T => {
  let value = cache.get(key);
  if (value === undefined) {
    value = create();
    cache.set(key, value);
  }
  return value;
};

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();

const invalidArguments = (name: string, context: ValueFunctionContext) => {
  context.warn(`A2UI function "${name}" received invalid arguments.`);
  return undefined;
};

const formatAmount = (
  name: string,
  args: Record<string, unknown>,
  context: ValueFunctionContext,
  currency?: string,
): unknown => {
  if (isMissing(args["value"])) return "";
  const value = toNumber(args["value"]);
  const decimals =
    args["decimals"] === undefined ? undefined : toNumber(args["decimals"]);
  if (
    value === undefined ||
    (args["decimals"] !== undefined &&
      (decimals === undefined ||
        !Number.isInteger(decimals) ||
        decimals < 0 ||
        decimals > 20))
  ) {
    return invalidArguments(name, context);
  }
  const options: Intl.NumberFormatOptions = {
    useGrouping: args["grouping"] !== false,
    ...(currency !== undefined ? { style: "currency", currency } : {}),
    ...(decimals !== undefined
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : {}),
  };
  try {
    return cached(
      numberFormats,
      JSON.stringify(options),
      () => new Intl.NumberFormat(undefined, options),
    ).format(value);
  } catch {
    return invalidArguments(name, context);
  }
};

const dateName = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
  type: Intl.DateTimeFormatPartTypes,
): string | undefined => {
  try {
    return cached(
      dateFormats,
      JSON.stringify(options),
      () => new Intl.DateTimeFormat(undefined, options),
    )
      .formatToParts(date)
      .find((part) => part.type === type)?.value;
  } catch {
    return undefined;
  }
};

const pad = (value: number, width: number) =>
  String(value).padStart(width, "0");

const dateField = (
  date: Date,
  letter: string,
  width: number,
): string | undefined => {
  switch (letter) {
    case "y":
      return width === 2
        ? pad(date.getFullYear() % 100, 2)
        : pad(date.getFullYear(), width);
    case "M":
      return width <= 2
        ? pad(date.getMonth() + 1, width)
        : dateName(
            date,
            { month: width === 3 ? "short" : width === 4 ? "long" : "narrow" },
            "month",
          );
    case "d":
      return pad(date.getDate(), width);
    case "E":
      return dateName(
        date,
        { weekday: width <= 3 ? "short" : width === 4 ? "long" : "narrow" },
        "weekday",
      );
    case "h":
      return pad(date.getHours() % 12 || 12, width);
    case "H":
      return pad(date.getHours(), width);
    case "m":
      return pad(date.getMinutes(), width);
    case "s":
      return pad(date.getSeconds(), width);
    case "a":
      return (
        dateName(date, { hour: "numeric", hour12: true }, "dayPeriod") ??
        (date.getHours() < 12 ? "AM" : "PM")
      );
    default:
      return undefined;
  }
};

const formatDatePattern = (date: Date, pattern: string): string | undefined => {
  let result = "";
  let index = 0;
  while (index < pattern.length) {
    const character = pattern[index]!;
    if (character === "'") {
      index++;
      if (pattern[index] === "'") {
        result += "'";
        index++;
        continue;
      }
      while (index < pattern.length) {
        if (pattern[index] !== "'") {
          result += pattern[index++];
        } else if (pattern[index + 1] === "'") {
          result += "'";
          index += 2;
        } else {
          index++;
          break;
        }
      }
    } else if (/[A-Za-z]/.test(character)) {
      let end = index + 1;
      while (pattern[end] === character) end++;
      const field = dateField(date, character, end - index);
      if (field === undefined) return undefined;
      result += field;
      index = end;
    } else {
      result += character;
      index++;
    }
  }
  return result;
};

const pluralCategory = (value: number): string => {
  try {
    return cached(pluralRules, "", () => new Intl.PluralRules()).select(value);
  } catch {
    return value === 1 ? "one" : "other";
  }
};

type ValueFunction = (
  args: Record<string, unknown>,
  context: ValueFunctionContext,
) => unknown;

const VALUE_FUNCTIONS: Readonly<Record<string, ValueFunction>> = {
  formatString: (args, context) => {
    const template = args["value"];
    if (template === undefined || template === null) return "";
    if (typeof template !== "string") {
      return invalidArguments("formatString", context);
    }
    let parts: ExpressionPart[];
    try {
      parts = parseExpressionTemplate(template);
    } catch (error) {
      if (!(error instanceof ExpressionSyntaxError)) throw error;
      context.warn(
        `A2UI formatString template is malformed: ${error.message}.`,
      );
      return undefined;
    }
    return parts
      .map((part) =>
        toText(
          typeof part === "object" && part !== null
            ? context.resolve(part)
            : part,
        ),
      )
      .join("");
  },
  formatNumber: (args, context) => formatAmount("formatNumber", args, context),
  formatCurrency: (args, context) =>
    typeof args["currency"] === "string"
      ? formatAmount("formatCurrency", args, context, args["currency"])
      : invalidArguments("formatCurrency", context),
  formatDate: (args, context) => {
    const value = args["value"];
    if (isMissing(value)) return "";
    const format = args["format"];
    const date = toDate(value);
    if (typeof format !== "string" || !date || Number.isNaN(date.getTime())) {
      return invalidArguments("formatDate", context);
    }
    const formatted = formatDatePattern(date, format);
    if (formatted !== undefined) return formatted;
    context.warn(
      `A2UI function "formatDate" does not support the pattern "${format}", so it returned an ISO date.`,
    );
    return date.toISOString();
  },
  pluralize: (args, context) => {
    if (isMissing(args["value"])) return "";
    const value = toNumber(args["value"]);
    if (value === undefined || typeof args["other"] !== "string") {
      return invalidArguments("pluralize", context);
    }
    const selected = args[pluralCategory(value)];
    return typeof selected === "string" ? selected : args["other"];
  },
  and: (args, context) =>
    Array.isArray(args["values"])
      ? args["values"].every(Boolean)
      : invalidArguments("and", context),
  or: (args, context) =>
    Array.isArray(args["values"])
      ? args["values"].some(Boolean)
      : invalidArguments("or", context),
  not: (args) => (args["value"] === undefined ? undefined : !args["value"]),
};

export const evaluateA2uiValueFunction = (
  name: string,
  args: Record<string, unknown>,
  context: ValueFunctionContext,
): unknown => {
  if (!Object.hasOwn(VALUE_FUNCTIONS, name)) {
    context.warn(`A2UI function "${name}" is not supported and was skipped.`);
    return undefined;
  }
  return VALUE_FUNCTIONS[name]!(args, context);
};
