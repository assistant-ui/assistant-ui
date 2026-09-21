import { describe, expect, it } from "vitest";
import { shallowEqual } from "./shallow-equal";

describe("shallowEqual", () => {
  it("detects a value in a previously empty array position", () => {
    const sparse = new Array<number>(1);
    const filled = [42];

    expect(shallowEqual(sparse, filled)).toBe(false);
    expect(shallowEqual(filled, sparse)).toBe(false);
  });

  it("compares sparse values at their array positions", () => {
    const left = new Array<number>(2);
    left[0] = 42;
    const right = new Array<number>(2);
    right[1] = 42;

    expect(shallowEqual(left, right)).toBe(false);
    expect(shallowEqual(right, left)).toBe(false);
  });

  it("treats empty array positions as undefined", () => {
    const sparse = new Array<undefined>(1);

    expect(shallowEqual(sparse, new Array<undefined>(1))).toBe(true);
    expect(shallowEqual(sparse, [undefined])).toBe(true);
    expect(shallowEqual([undefined], sparse)).toBe(true);
    expect(shallowEqual(sparse, [])).toBe(false);
    expect(shallowEqual([], sparse)).toBe(false);
  });

  it("preserves Object.is comparisons for array values", () => {
    expect(shallowEqual([NaN], [NaN])).toBe(true);
    expect(shallowEqual([0], [-0])).toBe(false);
  });
});
