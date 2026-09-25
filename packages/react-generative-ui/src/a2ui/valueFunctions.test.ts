import { describe, expect, it } from "vitest";
import {
  ExpressionSyntaxError,
  evaluateA2uiValueFunction,
  parseExpressionTemplate,
  type ExpressionPart,
} from "./valueFunctions";

const joinLiterals = (parts: ExpressionPart[]) =>
  parts.reduce<ExpressionPart[]>((joined, part) => {
    const last = joined.at(-1);
    if (typeof part === "string" && typeof last === "string") {
      joined[joined.length - 1] = last + part;
    } else {
      joined.push(part);
    }
    return joined;
  }, []);

// The parse_expression_template cases of a2ui-project/a2ui conformance/core/expressions.yaml.
const PARSE_CASES: [string, ExpressionPart[]][] = [
  ["hello world", ["hello world"]],
  ["", []],
  ["${user}", [{ path: "user" }]],
  ["value is ${/user/name}", ["value is ", { path: "/user/name" }]],
  ["${my-path.with_underscores}", [{ path: "my-path.with_underscores" }]],
  ["a ${x} b ${y} c", ["a ", { path: "x" }, " b ", { path: "y" }, " c"]],
  ["${x}${y}", [{ path: "x" }, { path: "y" }]],
  ["${'hello world'}", ["hello world"]],
  ['${"hello world"}', ["hello world"]],
  ["${'line\\nbreak'}", ["line\nbreak"]],
  ["${'it\\'s'}", ["it's"]],
  ["${42}", [42]],
  ["${1.5}", [1.5]],
  ["${007}", [7]],
  ["${true} ${false}", [true, " ", false]],
  ["${trueish}", [{ path: "trueish" }]],
  ["${now()}", [{ call: "now", args: {} }]],
  [
    "sum is ${add(a: 10, b: 20)}",
    ["sum is ", { call: "add", args: { a: 10, b: 20 } }],
  ],
  [
    "${format(value: /amount, suffix: ' USD', fallback: zero())}",
    [
      {
        call: "format",
        args: {
          value: { path: "/amount" },
          suffix: " USD",
          fallback: { call: "zero", args: {} },
        },
      },
    ],
  ],
  [
    "${outer(a: inner(b: 1))}",
    [{ call: "outer", args: { a: { call: "inner", args: { b: 1 } } } }],
  ],
  ["${${'hello'}}", ["hello"]],
  ["${   /user/name   }", [{ path: "/user/name" }]],
  ["\\${not_interpolated}", ["${not_interpolated}"]],
  ["before \\${x} after", ["before ${x} after"]],
  ["\\${literal} ${real}", ["${literal} ", { path: "real" }]],
  ["${1.}", [1]],
];

const MALFORMED_TEMPLATES = [
  "hello ${world",
  "${add(a: 1, b: 2}",
  "${add(a 1)}",
  "${true false}",
  "${1.2.3}",
];

describe("parseExpressionTemplate", () => {
  it.each(PARSE_CASES)("parses %j", (template, expected) => {
    expect(joinLiterals(parseExpressionTemplate(template))).toEqual(expected);
  });

  it.each(MALFORMED_TEMPLATES)("rejects %j", (template) => {
    expect(() => parseExpressionTemplate(template)).toThrow(
      ExpressionSyntaxError,
    );
  });

  it("rejects templates past the length and nesting caps", () => {
    expect(() => parseExpressionTemplate("x".repeat(10_001))).toThrow(
      ExpressionSyntaxError,
    );
    expect(() =>
      parseExpressionTemplate(`${"${".repeat(40)}1${"}".repeat(40)}`),
    ).toThrow(ExpressionSyntaxError);
  });
});

const evaluate = (
  name: string,
  args: Record<string, unknown>,
  data: Record<string, unknown> = {},
) => {
  const warnings: string[] = [];
  const value = evaluateA2uiValueFunction(name, args, {
    resolve: (part) =>
      typeof part === "object" && part !== null && "path" in part
        ? data[part.path]
        : undefined,
    warn: (message) => warnings.push(message),
  });
  return { value, warnings };
};

const dateName = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
  type: Intl.DateTimeFormatPartTypes,
) =>
  new Intl.DateTimeFormat(undefined, options)
    .formatToParts(date)
    .find((part) => part.type === type)!.value;

describe("evaluateA2uiValueFunction", () => {
  it("interpolates formatString paths and coerces values to text", () => {
    expect(
      evaluate(
        "formatString",
        { value: "Hi ${/name}, ${count} new ${/flag} ${/missing}|${/tags}" },
        { "/name": "Ada", count: 3, "/flag": true, "/tags": ["a", "b"] },
      ),
    ).toEqual({ value: 'Hi Ada, 3 new true |["a","b"]', warnings: [] });
  });

  it("warns and skips a malformed formatString template", () => {
    expect(evaluate("formatString", { value: "Hi ${name" })).toEqual({
      value: undefined,
      warnings: [
        "A2UI formatString template is malformed: an interpolation is not closed.",
      ],
    });
  });

  it("formats numbers and currencies with the requested decimals and grouping", () => {
    const number = (options: Intl.NumberFormatOptions, value: number) =>
      new Intl.NumberFormat(undefined, options).format(value);

    expect(evaluate("formatNumber", { value: 1234.5, decimals: 2 })).toEqual({
      value: number(
        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        1234.5,
      ),
      warnings: [],
    });
    expect(
      evaluate("formatNumber", { value: "1500", grouping: false }).value,
    ).toBe(number({ useGrouping: false }, 1500));
    expect(
      evaluate("formatCurrency", { value: 12.5, currency: "USD" }).value,
    ).toBe(number({ style: "currency", currency: "USD" }, 12.5));
  });

  it("formats a missing amount as empty text and warns on invalid arguments", () => {
    expect(evaluate("formatNumber", { value: undefined })).toEqual({
      value: "",
      warnings: [],
    });
    expect(evaluate("formatNumber", { value: "abc" })).toEqual({
      value: undefined,
      warnings: ['A2UI function "formatNumber" received invalid arguments.'],
    });
    expect(
      evaluate("formatNumber", { value: 1, decimals: 1.5 }).warnings,
    ).toEqual(['A2UI function "formatNumber" received invalid arguments.']);
    expect(evaluate("formatCurrency", { value: 1 }).warnings).toEqual([
      'A2UI function "formatCurrency" received invalid arguments.',
    ]);
    expect(
      evaluate("formatCurrency", { value: 1, currency: "not a code" }).warnings,
    ).toEqual(['A2UI function "formatCurrency" received invalid arguments.']);
  });

  it("formats dates with TR35 patterns, quoted literals, and padded fields", () => {
    const value = "2026-01-16T14:05:09";
    const date = new Date(value);
    const pm = dateName(date, { hour: "numeric", hour12: true }, "dayPeriod");
    const format = (pattern: string) =>
      evaluate("formatDate", { value, format: pattern }).value;

    expect(format("h:mm a")).toBe(`2:05 ${pm}`);
    expect(format("HH:mm:ss")).toBe("14:05:09");
    expect(format("yy/M/d, yyyy-MM-dd")).toBe("26/1/16, 2026-01-16");
    expect(format("EEEE, MMM d 'at' h:mm a")).toBe(
      `${dateName(date, { weekday: "long" }, "weekday")}, ${dateName(date, { month: "short" }, "month")} 16 at 2:05 ${pm}`,
    );
    expect(format("MMMM d, E")).toBe(
      `${dateName(date, { month: "long" }, "month")} 16, ${dateName(date, { weekday: "short" }, "weekday")}`,
    );
    expect(format("h 'o''clock'")).toBe("2 o'clock");
  });

  it("reads a date-only value as a local calendar date", () => {
    expect(
      evaluate("formatDate", {
        value: "2026-01-16",
        format: "yyyy-MM-dd HH:mm",
      }).value,
    ).toBe("2026-01-16 00:00");
  });

  it("falls back to an ISO date for an unsupported pattern and warns on an invalid date", () => {
    const value = "2026-01-16T14:05:09";
    expect(evaluate("formatDate", { value, format: "YYYY" })).toEqual({
      value: new Date(value).toISOString(),
      warnings: [
        'A2UI function "formatDate" does not support the pattern "YYYY", so it returned an ISO date.',
      ],
    });
    expect(
      evaluate("formatDate", { value: "not a date", format: "d" }).warnings,
    ).toEqual(['A2UI function "formatDate" received invalid arguments.']);
    expect(evaluate("formatDate", { value: undefined, format: "d" })).toEqual({
      value: "",
      warnings: [],
    });
  });

  it("selects a plural category and falls back to other", () => {
    const category = new Intl.PluralRules().select(1);
    expect(
      evaluate("pluralize", {
        value: 1,
        [category]: "1 review",
        other: "reviews",
      }).value,
    ).toBe("1 review");
    expect(evaluate("pluralize", { value: 2, other: "reviews" }).value).toBe(
      "reviews",
    );
  });

  it("evaluates boolean functions by truthiness", () => {
    expect(evaluate("and", { values: [true, 1] }).value).toBe(true);
    expect(evaluate("and", { values: [true, ""] }).value).toBe(false);
    expect(evaluate("or", { values: [false, "x"] }).value).toBe(true);
    expect(evaluate("not", { value: 0 }).value).toBe(true);
    expect(evaluate("not", { value: undefined }).value).toBeUndefined();
  });

  it("warns instead of evaluating a function it does not support", () => {
    expect(evaluate("customValue", {})).toEqual({
      value: undefined,
      warnings: [
        'A2UI function "customValue" is not supported and was skipped.',
      ],
    });
  });
});
