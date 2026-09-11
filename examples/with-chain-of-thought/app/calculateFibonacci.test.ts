import { describe, expect, it } from "vitest";
import { calculateFibonacci } from "./calculateFibonacci";

describe("calculateFibonacci", () => {
  it.each([
    [0, "0"],
    [1, "1"],
    [2, "1"],
    [20, "6765"],
  ])("calculates Fibonacci(%i)", (index, expected) => {
    expect(calculateFibonacci(index)).toBe(expected);
  });

  it("keeps large results exact", () => {
    expect(calculateFibonacci(100)).toBe("354224848179261915075");
  });
});
