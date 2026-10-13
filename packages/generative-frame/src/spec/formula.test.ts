// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evaluateFormula, formulaIssue } from "./formula";

describe("evaluateFormula", () => {
  it("evaluates precedence, conditionals, and boolean operators", () => {
    const context = { state: { count: 4 } };
    expect(evaluateFormula("1 + 2 * 3", context)).toBe(7);
    expect(evaluateFormula("${/count} > 2 ? 'many' : 'few'", context)).toBe(
      "many",
    );
    expect(evaluateFormula("false || !(${/count} < 2)", context)).toBe(true);
    expect(evaluateFormula("${/count} == 4 && 2 != 3", context)).toBe(true);
  });

  it("reads state, repeat items, indexes, and event payloads safely", () => {
    const context = {
      state: { count: 3, list: [{ price: 4 }, { price: 6 }] },
      item: { price: 8 },
      index: 2,
      event: { value: 5 },
    };
    expect(
      evaluateFormula("${/count} + ${$item/price} + ${$index}", context),
    ).toBe(13);
    expect(evaluateFormula("${$event/value}", context)).toBe(5);
    expect(evaluateFormula("sum(${/list}, '/price')", context)).toBe(10);
    expect(evaluateFormula("${/missing}", context)).toBeNull();
    expect(evaluateFormula("${/missing} == null", context)).toBe(false);
    expect(evaluateFormula("${/missing} + ' lb'", context)).toBe(" lb");
    expect(evaluateFormula("${}", context)).toBe(context.state);
    expect(evaluateFormula("round(1.2, ${/missing})", context)).toBeNull();
    expect(evaluateFormula("number(1, ${/missing})", context)).toBeNull();
    expect(evaluateFormula("sum(${/list}, ${/missing})", context)).toBeNull();
    expect(evaluateFormula("${/constructor}", context)).toBeNull();
  });

  it("supports number and list functions", () => {
    const context = {
      state: { values: [3, 1, 5], rows: [{ amount: 2 }, { amount: 6 }] },
    };
    expect(evaluateFormula("round(2.345, 2)", context)).toBe(2.35);
    expect(evaluateFormula("floor(-1.2) + ceil(1.2) + abs(-2)", context)).toBe(
      2,
    );
    expect(evaluateFormula("min(${/values})", context)).toBe(1);
    expect(evaluateFormula("max(${/values})", context)).toBe(5);
    expect(evaluateFormula("count(${/values})", context)).toBe(3);
    expect(evaluateFormula("avg(${/rows}, '/amount')", context)).toBe(4);
    expect(evaluateFormula("clamp(12, 0, 10)", context)).toBe(10);
  });

  it("formats text functions with en-US formatters", () => {
    const context = { state: {} };
    expect(evaluateFormula("number(1234.567, 2)", context)).toBe("1,234.57");
    expect(evaluateFormula("number(12, 2)", context)).toBe("12.00");
    expect(evaluateFormula("currency(2, 'USD')", context)).toBe("$2.00");
    expect(evaluateFormula("percent(0.125, 1)", context)).toBe("12.5%");
    expect(evaluateFormula("percent(0.5, 2)", context)).toBe("50.00%");
    expect(evaluateFormula("time(900)", context)).toBe("3:00 PM");
    expect(evaluateFormula("plural(1, 'guest', 'guests')", context)).toBe(
      "guest",
    );
    expect(evaluateFormula("plural(2, 'guest', 'guests')", context)).toBe(
      "guests",
    );
  });

  it("returns null for failed arithmetic and invalid runtime values", () => {
    const context = { state: { value: "not a number", values: [1, "x"] } };
    expect(evaluateFormula("1 / 0", context)).toBeNull();
    expect(evaluateFormula("1e308 * 1e308", context)).toBeNull();
    expect(
      evaluateFormula("${/value}", {
        state: { value: Number.NaN },
      }),
    ).toBeNull();
    expect(evaluateFormula("${/value} * 1", context)).toBeNull();
    expect(evaluateFormula("${/missing} + 1", context)).toBeNull();
    expect(evaluateFormula("sum(${/values})", context)).toBeNull();
    expect(
      evaluateFormula("currency(1, 'not-a-currency')", context),
    ).toBeNull();
  });

  it("bounds list evaluation", () => {
    const state = {
      values: Array.from({ length: 10_000 }, (_, index) => index),
    };
    expect(evaluateFormula("sum(${/values})", { state })).toBeNull();
    expect(formulaIssue("sum(${/values})", { state })).toContain(
      "10000-step evaluation limit",
    );
  });
});

describe("formulaIssue", () => {
  it("reports malformed formulas, functions, and argument counts", () => {
    expect(formulaIssue("1 +")).toContain("Expected a value");
    expect(formulaIssue("mystery(1)")).toContain('Unknown function "mystery"');
    expect(formulaIssue("abs() ")).toContain(
      'Function "abs" expects 1 argument',
    );
    expect(formulaIssue({})).toContain("must be a formula string");
  });

  it("reports formula length and nesting limits", () => {
    expect(formulaIssue("1".repeat(501))).toContain("500-character limit");
    expect(formulaIssue(`${"(".repeat(32)}1${")".repeat(32)}`)).toBeUndefined();
    expect(formulaIssue(`${"(".repeat(33)}1${")".repeat(33)}`)).toContain(
      "32-level nesting limit",
    );
  });
});
