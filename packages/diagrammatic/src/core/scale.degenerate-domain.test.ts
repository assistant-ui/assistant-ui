import { describe, expect, it } from "vitest";
import { positiveExtent } from "./geometry";
import { expandDegenerateDomain } from "./scale";

describe("expandDegenerateDomain", () => {
  it("expands Number.MIN_VALUE to distinct finite bounds", () => {
    const [lo, hi] = expandDegenerateDomain([
      Number.MIN_VALUE,
      Number.MIN_VALUE,
    ]);
    expect(Number.isFinite(lo)).toBe(true);
    expect(Number.isFinite(hi)).toBe(true);
    expect(lo).toBeLessThan(Number.MIN_VALUE);
    expect(hi).toBeGreaterThan(Number.MIN_VALUE);
  });

  it.each([Number.MAX_VALUE, -Number.MAX_VALUE])(
    "keeps the expanded bounds finite around %s",
    (value) => {
      const [lo, hi] = expandDegenerateDomain([value, value]);
      expect(Number.isFinite(lo)).toBe(true);
      expect(Number.isFinite(hi)).toBe(true);
      expect(lo).toBeLessThan(hi);
      expect(lo).toBeLessThanOrEqual(value);
      expect(hi).toBeGreaterThanOrEqual(value);
    },
  );
});

describe("positiveExtent", () => {
  it("centers a single positive value on a log scale", () => {
    expect(positiveExtent([10, 10])).toEqual([
      10 / Math.sqrt(10),
      10 * Math.sqrt(10),
    ]);
  });

  it("keeps a single Number.MAX_VALUE finite", () => {
    const [lo, hi] = positiveExtent([Number.MAX_VALUE]);
    expect(lo).toBeLessThan(hi);
    expect(hi).toBe(Number.MAX_VALUE);
  });
});
