import { describe, expect, it } from "vitest";
import { formatCompact } from "./types";

describe("formatCompact", () => {
  describe.each([
    [1, ""],
    [1e3, "k"],
    [1e6, "m"],
    [1e9, "b"],
  ] as const)("at a scale of %s", (scale, suffix) => {
    it.each([
      [1, "1"],
      [1.25, "1.3"],
      [99.9, "99.9"],
      [100, "100"],
      [100.1, "100"],
      [123.456, "123"],
      [123.567, "124"],
      [999.9, "1000"],
    ] as const)(
      "formats both signs of %s with the same precision",
      (value, expected) => {
        expect(formatCompact(value * scale)).toBe(`${expected}${suffix}`);
        expect(formatCompact(-value * scale)).toBe(`-${expected}${suffix}`);
      },
    );
  });

  it.each([
    [0, "0"],
    [-0, "0"],
    [42, "42"],
    [-42, "-42"],
  ] as const)("formats the integer %s as %s", (value, expected) => {
    expect(formatCompact(value)).toBe(expected);
  });
});
