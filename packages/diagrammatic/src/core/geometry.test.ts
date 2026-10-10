import { describe, expect, it } from "vitest";
import { linear, positiveExtent, project, rowMarkH, rowMid } from "./geometry";

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

describe("project", () => {
  it("matches linear on linear paper", () => {
    const A = project("linear", 1, 100, 0, 10);
    const B = linear(1, 100, 0, 10);
    expect(A(10)).toBe(B(10));
    expect(A(100)).toBe(10);
  });

  it("puts decades at even steps on log paper", () => {
    const X = project("log", 1, 1000, 0, 3);
    expect(X(1)).toBeCloseTo(0);
    expect(X(10)).toBeCloseTo(1);
    expect(X(100)).toBeCloseTo(2);
    expect(X(1000)).toBeCloseTo(3);
  });

  it("clamps non-positive input instead of returning NaN", () => {
    const X = project("log", 1, 100, 0, 10);
    expect(Number.isFinite(X(0))).toBe(true);
    expect(Number.isFinite(X(-4))).toBe(true);
  });
});

describe("positiveExtent", () => {
  it("drops zeros and negatives", () => {
    expect(positiveExtent([-2, 0, 4, 16])).toEqual([4, 16]);
  });

  it("falls back when nothing is positive", () => {
    expect(positiveExtent([0, -1])).toEqual([1, 10]);
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
