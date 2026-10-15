import { describe, expect, it } from "vitest";
import { upperBound } from "./scale";

describe("upperBound", () => {
  it("handles at least 200,000 values alongside ticks and guides", () => {
    const values = Array(200_000).fill(2);
    values[199_999] = 42;

    expect(upperBound(values, [{ at: 50, label: "50" }], [{ at: 60 }])).toBe(
      60,
    );
  });

  it("preserves the floor and special number behavior", () => {
    expect(upperBound([], undefined, undefined, -0)).toBe(-0);
    expect(upperBound([-0], undefined, undefined, -0)).toBe(-0);
    expect(upperBound([5], undefined, undefined, 10)).toBe(10);
    expect(upperBound([Number.POSITIVE_INFINITY])).toBe(
      Number.POSITIVE_INFINITY,
    );
    expect(upperBound([Number.NaN])).toBeNaN();
  });
});
