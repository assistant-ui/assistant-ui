type EvaluationContext = {
  readonly resolvePath: (path: string) => unknown;
  readonly warn: (message: string) => void;
};

const VALUE_FUNCTION_DEPTH_CAP = 32;

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const interpolationString = (value: unknown): string =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? String(value)
    : "";

const splitArguments = (value: string): string[] => {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;
  for (let index = 0; index < value.length; index++) {
    const character = value[index]!;
    if (quote) {
      if (character === "\\") index++;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (value.startsWith("${", index)) {
      depth++;
      index++;
    } else if (character === "}" && depth > 0) depth--;
    else if (character === "(" || character === "[") depth++;
    else if ((character === ")" || character === "]") && depth > 0) depth--;
    else if (character === "," && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result.filter(Boolean);
};

const namedArgument = (value: string): [string, string] | undefined => {
  let depth = 0;
  let quote: string | undefined;
  for (let index = 0; index < value.length; index++) {
    const character = value[index]!;
    if (quote) {
      if (character === "\\") index++;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (value.startsWith("${", index)) {
      depth++;
      index++;
    } else if (character === "}" && depth > 0) depth--;
    else if (character === "(" || character === "[") depth++;
    else if ((character === ")" || character === "]") && depth > 0) depth--;
    else if (character === ":" && depth === 0) {
      const name = value.slice(0, index).trim();
      if (!/^[A-Za-z_][\w]*$/.test(name)) return undefined;
      return [name, value.slice(index + 1).trim()];
    }
  }
  return undefined;
};

const matchingExpressionEnd = (value: string, start: number): number => {
  let depth = 1;
  let quote: string | undefined;
  for (let index = start + 2; index < value.length; index++) {
    const character = value[index]!;
    if (quote) {
      if (character === "\\") index++;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (value.startsWith("${", index)) {
      depth++;
      index++;
    } else if (character === "}" && --depth === 0) return index;
  }
  return -1;
};

const evaluateCall = (
  name: string,
  args: Record<string, unknown>,
  context: EvaluationContext,
  depth: number,
): unknown => {
  if (depth >= VALUE_FUNCTION_DEPTH_CAP) {
    context.warn(
      `A2UI value function "${name}" exceeded the evaluation depth cap.`,
    );
    return undefined;
  }

  if (name === "formatString") {
    if (typeof args["value"] !== "string") {
      context.warn(
        'A2UI value function "formatString" requires a string value.',
      );
      return undefined;
    }
    return interpolate(args["value"], context, depth + 1);
  }

  if (name === "formatNumber" || name === "formatCurrency") {
    const value = asFiniteNumber(args["value"]);
    const decimals = args["decimals"];
    const decimalPlaces = asFiniteNumber(decimals);
    if (
      value === undefined ||
      (args["grouping"] !== undefined &&
        typeof args["grouping"] !== "boolean") ||
      (decimals !== undefined &&
        (decimalPlaces === undefined ||
          !Number.isInteger(decimalPlaces) ||
          decimalPlaces < 0 ||
          decimalPlaces > 20))
    ) {
      context.warn(`A2UI value function "${name}" has invalid arguments.`);
      return undefined;
    }
    const options: Intl.NumberFormatOptions = {
      useGrouping: args["grouping"] !== false,
      ...(decimals !== undefined
        ? {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }
        : {}),
    };
    try {
      if (name === "formatCurrency") {
        if (typeof args["currency"] !== "string") {
          context.warn(
            'A2UI value function "formatCurrency" requires a currency code.',
          );
          return undefined;
        }
        return new Intl.NumberFormat(undefined, {
          ...options,
          style: "currency",
          currency: args["currency"],
        }).format(value);
      }
      return new Intl.NumberFormat(undefined, options).format(value);
    } catch {
      context.warn(`A2UI value function "${name}" has invalid arguments.`);
      return undefined;
    }
  }

  if (name === "formatDate") {
    const value = args["value"];
    if (
      (typeof value !== "string" && typeof value !== "number") ||
      typeof args["format"] !== "string"
    ) {
      context.warn('A2UI value function "formatDate" has invalid arguments.');
      return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      context.warn('A2UI value function "formatDate" has invalid arguments.');
      return undefined;
    }
    return formatDate(date, args["format"]);
  }

  if (name === "pluralize") {
    const value = asFiniteNumber(args["value"]);
    if (value === undefined || typeof args["other"] !== "string") {
      context.warn('A2UI value function "pluralize" has invalid arguments.');
      return undefined;
    }
    const category = new Intl.PluralRules().select(value);
    const selected = args[category];
    return typeof selected === "string" ? selected : args["other"];
  }

  if (name === "and" || name === "or") {
    const values = args["values"];
    if (
      !Array.isArray(values) ||
      !values.every((value) => typeof value === "boolean")
    ) {
      context.warn(`A2UI value function "${name}" requires boolean values.`);
      return undefined;
    }
    return name === "and" ? values.every(Boolean) : values.some(Boolean);
  }

  if (name === "not") {
    if (typeof args["value"] !== "boolean") {
      context.warn('A2UI value function "not" requires a boolean value.');
      return undefined;
    }
    return !args["value"];
  }

  context.warn(`A2UI value function "${name}" is not supported.`);
  return undefined;
};

const parseExpressionValue = (
  value: string,
  context: EvaluationContext,
  depth: number,
): unknown => {
  const expression = value.trim();
  if (expression.startsWith("${")) {
    const end = matchingExpressionEnd(expression, 0);
    if (end === expression.length - 1) {
      return evaluateExpression(expression.slice(2, end), context, depth + 1);
    }
  }
  if (
    (expression.startsWith('"') && expression.endsWith('"')) ||
    (expression.startsWith("'") && expression.endsWith("'"))
  ) {
    const body = expression.slice(1, -1);
    return body.replace(/\\([\\'"nrt])/g, (_match, escaped: string) => {
      if (escaped === "n") return "\n";
      if (escaped === "r") return "\r";
      if (escaped === "t") return "\t";
      return escaped;
    });
  }
  if (expression === "true") return true;
  if (expression === "false") return false;
  if (expression === "null") return null;
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(expression)) {
    return Number(expression);
  }
  return evaluateExpression(expression, context, depth + 1);
};

const evaluateExpression = (
  value: string,
  context: EvaluationContext,
  depth: number,
): unknown => {
  const expression = value.trim();
  if (expression.startsWith("${")) {
    return parseExpressionValue(expression, context, depth + 1);
  }
  const open = expression.indexOf("(");
  if (open > 0 && expression.endsWith(")")) {
    const name = expression.slice(0, open).trim();
    if (!/^[A-Za-z_][\w]*$/.test(name)) {
      context.warn("A2UI formatString contains a malformed expression.");
      return undefined;
    }
    const args: Record<string, unknown> = {};
    for (const entry of splitArguments(expression.slice(open + 1, -1))) {
      const parsed = namedArgument(entry);
      if (!parsed) {
        context.warn(`A2UI value function "${name}" has malformed arguments.`);
        return undefined;
      }
      args[parsed[0]] = parseExpressionValue(parsed[1], context, depth + 1);
    }
    return evaluateCall(name, args, context, depth + 1);
  }
  return context.resolvePath(expression);
};

const interpolate = (
  value: string,
  context: EvaluationContext,
  depth: number,
): string => {
  let result = "";
  for (let index = 0; index < value.length;) {
    if (value.startsWith("\\${", index)) {
      result += "${";
      index += 3;
      continue;
    }
    if (!value.startsWith("${", index)) {
      result += value[index]!;
      index++;
      continue;
    }
    const end = matchingExpressionEnd(value, index);
    if (end === -1) {
      context.warn("A2UI formatString contains an unclosed expression.");
      result += value.slice(index);
      break;
    }
    result += interpolationString(
      evaluateExpression(value.slice(index + 2, end), context, depth + 1),
    );
    index = end + 1;
  }
  return result;
};

const formatDate = (date: Date, pattern: string): string => {
  const tokens = /yyyy|yy|MMMM|MMM|MM|M|EEEE|EEE|E|dd|d|HH|H|hh|h|mm|m|ss|s|a/g;
  return pattern.replace(tokens, (token) => {
    const options: Intl.DateTimeFormatOptions = {};
    if (token.startsWith("y")) {
      options.year = token === "yy" ? "2-digit" : "numeric";
      const year = new Intl.DateTimeFormat(undefined, options).format(date);
      return token === "yyyy" && Number(year) < 1000
        ? year.padStart(4, "0")
        : year;
    }
    if (token.startsWith("M")) {
      options.month =
        token === "MMMM"
          ? "long"
          : token === "MMM"
            ? "short"
            : token === "MM"
              ? "2-digit"
              : "numeric";
    } else if (token.startsWith("E")) {
      options.weekday = token === "EEEE" ? "long" : "short";
    } else if (token === "a") {
      options.hour = "numeric";
      options.hourCycle = "h12";
      return (
        new Intl.DateTimeFormat(undefined, options)
          .formatToParts(date)
          .find((part) => part.type === "dayPeriod")?.value ?? ""
      );
    } else if (token.startsWith("h") || token.startsWith("H")) {
      options.hour = token.length === 2 ? "2-digit" : "numeric";
      options.hourCycle = token.startsWith("h") ? "h12" : "h23";
    } else if (token.startsWith("m")) {
      options.minute = token.length === 2 ? "2-digit" : "numeric";
    } else if (token.startsWith("s")) {
      options.second = token.length === 2 ? "2-digit" : "numeric";
    } else if (token.startsWith("d")) {
      options.day = token.length === 2 ? "2-digit" : "numeric";
    }
    return new Intl.DateTimeFormat(undefined, options).format(date);
  });
};

export const evaluateA2uiValueFunction = (
  name: string,
  args: Record<string, unknown>,
  context: EvaluationContext,
): unknown => evaluateCall(name, args, context, 0);
