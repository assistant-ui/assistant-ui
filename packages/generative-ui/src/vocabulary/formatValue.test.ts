import { afterEach, describe, expect, it, vi } from "vitest";
import { factTrend, formatValue } from "./formatValue";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatValue", () => {
  it.each(["0", "0%", "+0.0%", "−0", "$0"])(
    "infers %s as a flat fact delta",
    (delta) => {
      expect(factTrend(delta, undefined)).toBe("flat");
    },
  );

  it("formats numbers, currency, percentages, and dates", () => {
    expect(formatValue(1234.567, { kind: "number", decimals: 2 })).toBe(
      "1,234.57",
    );
    expect(
      formatValue(1234.5, { kind: "currency", currency: "USD", decimals: 2 }),
    ).toBe("$1,234.50");
    expect(formatValue(0.1234, { kind: "percent", decimals: 1 })).toBe("12.3%");
    expect(formatValue("2024-01-02", { kind: "date" })).toBe("Jan 2, 2024");
    expect(formatValue(0, { kind: "date" })).toBe(
      new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(0),
    );
  });

  it("keeps a date-only value on its calendar day west of UTC", () => {
    const DateTimeFormat = Intl.DateTimeFormat;
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      function (locales, options) {
        return new DateTimeFormat(locales, {
          timeZone: "America/Los_Angeles",
          ...options,
        });
      },
    );

    expect(formatValue("2026-09-26", { kind: "date" })).toBe("Sep 26, 2026");
  });

  it("keeps impossible ISO calendar dates as raw text", () => {
    expect(formatValue("2024-02-30", { kind: "date" })).toBe("2024-02-30");
    expect(formatValue("2023-02-29", { kind: "date" })).toBe("2023-02-29");
    expect(formatValue("2024-04-31", { kind: "date" })).toBe("2024-04-31");
    expect(formatValue("2024-02-29", { kind: "date" })).toBe("Feb 29, 2024");
  });

  it("clamps decimal precision", () => {
    expect(formatValue(1.234, { kind: "number", decimals: -2 })).toBe("1");
    expect(formatValue(1.234, { kind: "number", decimals: 30 })).toBe(
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 20,
        maximumFractionDigits: 20,
      }).format(1.234),
    );
  });

  it("keeps wrong-typed values and invalid formats as raw text", () => {
    expect(formatValue("1234", { kind: "number" })).toBe("1234");
    expect(formatValue("0.2", { kind: "percent" })).toBe("0.2");
    expect(formatValue("not a date", { kind: "date" })).toBe("not a date");
    expect(() =>
      formatValue(12, { kind: "currency", currency: "not-a-currency" }),
    ).not.toThrow();
    expect(
      formatValue(12, { kind: "currency", currency: "not-a-currency" }),
    ).toBe("12");
  });
});
