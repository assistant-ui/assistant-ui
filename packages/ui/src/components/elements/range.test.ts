import { describe, expect, it } from "vitest";
import { at, clamp, pct, progressOf, take } from "./range";

describe("clamp", () => {
  it("passes an in-range value through", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("constrains both ends", () => {
    expect(clamp(-4, 0, 10)).toBe(0);
    expect(clamp(40, 0, 10)).toBe(10);
  });

  it("maps the infinities to the bounds", () => {
    expect(clamp(Number.POSITIVE_INFINITY, 0, 10)).toBe(10);
    expect(clamp(Number.NEGATIVE_INFINITY, 0, 10)).toBe(0);
  });

  it("maps NaN to the lower bound", () => {
    expect(clamp(Number.NaN, 2, 10)).toBe(2);
  });
});

describe("take", () => {
  const items = ["a", "b", "c"];

  it("takes the first n", () => {
    expect(take(items, 2)).toEqual(["a", "b"]);
  });

  it("takes nothing for a negative count, rather than counting from the end", () => {
    expect(take(items, -2)).toEqual([]);
    expect(items.slice(0, -2)).toEqual(["a"]);
  });

  it("takes everything for a count past the end", () => {
    expect(take(items, 99)).toEqual(items);
    expect(take(items, Number.POSITIVE_INFINITY)).toEqual(items);
  });

  it("truncates a fractional count", () => {
    expect(take(items, 1.9)).toEqual(["a"]);
  });

  it("takes nothing for NaN or from an empty list", () => {
    expect(take(items, Number.NaN)).toEqual([]);
    expect(take([], 3)).toEqual([]);
  });
});

describe("at", () => {
  const items = ["a", "b", "c"];

  it("reads an in-range index", () => {
    expect(at(items, 1)).toBe("b");
  });

  it("clamps an out-of-range index to an end", () => {
    expect(at(items, -5)).toBe("a");
    expect(at(items, 99)).toBe("c");
  });

  it("floors a fractional index rather than reading a hole", () => {
    expect(at(items, 1.5)).toBe("b");
  });

  it("is undefined for an empty list", () => {
    expect(at([], 0)).toBeUndefined();
  });
});

describe("pct", () => {
  it("computes a share", () => {
    expect(pct(1, 4)).toBe(25);
  });

  it("stays inside 0 to 100", () => {
    expect(pct(-3, 4)).toBe(0);
    expect(pct(9, 4)).toBe(100);
  });

  it("is 0 for a non-positive total, rather than NaN or Infinity", () => {
    expect(pct(3, 0)).toBe(0);
    expect(pct(3, -1)).toBe(0);
    expect(pct(Number.NaN, 4)).toBe(0);
  });
});

describe("progressOf", () => {
  it("counts completed items inside 0 to total", () => {
    expect(progressOf(2, 5)).toBe(2);
    expect(progressOf(-2, 5)).toBe(0);
    expect(progressOf(9, 5)).toBe(5);
    expect(progressOf(Number.NaN, 5)).toBe(0);
  });
});
