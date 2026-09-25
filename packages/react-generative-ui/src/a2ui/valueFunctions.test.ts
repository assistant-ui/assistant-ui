import { describe, expect, it } from "vitest";
import { evaluateA2uiValueFunction } from "./valueFunctions";

describe("evaluateA2uiValueFunction", () => {
  it("formats numbers, currencies, and dates", () => {
    const warnings: string[] = [];
    const context = {
      resolvePath: () => undefined,
      warn: (value: string) => warnings.push(value),
    };

    expect(
      evaluateA2uiValueFunction(
        "formatNumber",
        { value: 1234, decimals: 0, grouping: false },
        context,
      ),
    ).toBe("1234");
    expect(
      evaluateA2uiValueFunction(
        "formatCurrency",
        { value: 12.5, currency: "USD", decimals: 2, grouping: false },
        context,
      ),
    ).toBe(
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: false,
      }).format(12.5),
    );
    expect(
      evaluateA2uiValueFunction(
        "formatDate",
        { value: "2024-01-02T12:00:00", format: "yyyy-MM-dd" },
        context,
      ),
    ).toBe("2024-01-02");
    expect(warnings).toEqual([]);
  });

  it("selects plural categories and evaluates boolean functions", () => {
    const warnings: string[] = [];
    const context = {
      resolvePath: () => undefined,
      warn: (value: string) => warnings.push(value),
    };

    expect(
      evaluateA2uiValueFunction(
        "pluralize",
        { value: 1, one: "one item", other: "items" },
        context,
      ),
    ).toBe("one item");
    expect(
      evaluateA2uiValueFunction("and", { values: [true, false] }, context),
    ).toBe(false);
    expect(
      evaluateA2uiValueFunction("or", { values: [false, true] }, context),
    ).toBe(true);
    expect(evaluateA2uiValueFunction("not", { value: true }, context)).toBe(
      false,
    );
    expect(warnings).toEqual([]);
  });

  it("warns instead of evaluating unregistered calls", () => {
    const warnings: string[] = [];

    expect(
      evaluateA2uiValueFunction(
        "customValue",
        {},
        {
          resolvePath: () => undefined,
          warn: (value) => warnings.push(value),
        },
      ),
    ).toBeUndefined();
    expect(warnings).toEqual([
      'A2UI value function "customValue" is not supported.',
    ]);
  });
});
