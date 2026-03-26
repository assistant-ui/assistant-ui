import { describe, expect, it } from "vitest";
import { autoLevels } from "../utils/classify";

describe("autoLevels", () => {
  it("returns 0 for all zeros", () => {
    const classify = autoLevels(5)([0, 0, 0]);
    expect(classify(0)).toBe(0);
  });

  it("returns 0 for count 0 even with non-zero data", () => {
    const classify = autoLevels(5)([0, 10, 20]);
    expect(classify(0)).toBe(0);
  });

  it("returns n-1 for max count", () => {
    const classify = autoLevels(5)([0, 5, 10]);
    expect(classify(10)).toBe(4);
  });

  it("distributes levels across range", () => {
    const classify = autoLevels(5)([0, 25, 50, 75, 100]);
    expect(classify(0)).toBe(0);
    expect(classify(25)).toBe(1);
    expect(classify(50)).toBe(2);
    expect(classify(75)).toBe(3);
    expect(classify(100)).toBe(4);
  });

  it("handles single non-zero value", () => {
    const classify = autoLevels(5)([0, 7]);
    expect(classify(7)).toBe(4);
    expect(classify(0)).toBe(0);
  });

  it("handles empty counts array", () => {
    const classify = autoLevels(5)([]);
    expect(classify(0)).toBe(0);
    expect(classify(5)).toBe(0);
  });

  it("works with 2 levels", () => {
    const classify = autoLevels(2)([0, 10]);
    expect(classify(0)).toBe(0);
    expect(classify(5)).toBe(1);
    expect(classify(10)).toBe(1);
  });
});
