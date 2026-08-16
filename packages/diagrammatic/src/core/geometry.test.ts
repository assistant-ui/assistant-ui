import { describe, expect, it } from "vitest";
import { linear, rowMarkH, rowMid } from "./geometry";

describe("linear", () => {
  it("maps domain ends onto the range", () => {
    const X = linear(0, 10, 20, 180);
    expect(X(0)).toBe(20);
    expect(X(10)).toBe(180);
    expect(X(5)).toBe(100);
  });

  it("inverts when the range runs downward", () => {
    const Y = linear(0, 100, 80, 10);
    expect(Y(0)).toBe(80);
    expect(Y(100)).toBe(10);
    expect(Y(50)).toBe(45);
  });

  it("survives a zero-width domain", () => {
    const X = linear(4, 4, 0, 10);
    expect(X(4)).toBe(0);
    expect(X(5)).toBe(10);
  });
});

describe("row slots", () => {
  it("centers each row in its band", () => {
    expect(rowMid(0, 10, 8)).toBe(13);
    expect(rowMid(2, 10, 8)).toBe(33);
  });

  it("keeps mark height inside the row", () => {
    expect(rowMarkH(8)).toBeGreaterThanOrEqual(2.4);
    expect(rowMarkH(8)).toBeLessThan(8);
    expect(rowMarkH(20, 0.4)).toBe(8);
  });
});
