import { describe, expect, it } from "vitest";
import { clamp, take } from "./range";

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

  it("maps NaN to the lower bound, ahead of the inverted-bounds rule", () => {
    expect(clamp(Number.NaN, 2, 10)).toBe(2);
    expect(clamp(Number.NaN, 1, 0)).toBe(1);
  });

  it("lets max win when an empty collection inverts the bounds", () => {
    expect(clamp(3, 1, 0)).toBe(0);
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
