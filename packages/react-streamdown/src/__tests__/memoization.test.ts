import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { memoCompareNodes } from "../memoization";

describe("memoCompareNodes", () => {
  it("returns true for identical props", () => {
    const props = { className: "test", id: "foo" };
    expect(memoCompareNodes(props, props)).toBe(true);
  });

  it("returns true for equal primitive props", () => {
    const prev = { className: "test", count: 5 };
    const next = { className: "test", count: 5 };
    expect(memoCompareNodes(prev, next)).toBe(true);
  });

  it("returns false for different primitive props", () => {
    const prev = { className: "test", count: 5 };
    const next = { className: "test", count: 6 };
    expect(memoCompareNodes(prev, next)).toBe(false);
  });

  it("returns false for different number of props", () => {
    const prev = { className: "test" };
    const next = { className: "test", id: "foo" };
    expect(memoCompareNodes(prev, next)).toBe(false);
  });

  it("returns true for same string children", () => {
    const prev = { children: "hello" };
    const next = { children: "hello" };
    expect(memoCompareNodes(prev, next)).toBe(true);
  });

  it("returns false for different string children", () => {
    const prev = { children: "hello" };
    const next = { children: "world" };
    expect(memoCompareNodes(prev, next)).toBe(false);
  });

  it("returns true for null children", () => {
    const prev = { children: null };
    const next = { children: null };
    expect(memoCompareNodes(prev, next)).toBe(true);
  });

  it("returns true for same React element type and key", () => {
    const child = createElement("div", { key: "1" }, "content");
    const prev = { children: child };
    const next = { children: child };
    expect(memoCompareNodes(prev, next)).toBe(true);
  });

  it("returns true for equivalent React elements (same type and key)", () => {
    const prev = { children: createElement("div", { key: "1" }) };
    const next = { children: createElement("div", { key: "1" }) };
    expect(memoCompareNodes(prev, next)).toBe(true);
  });

  it("returns false for different React element types", () => {
    const prev = { children: createElement("div", { key: "1" }) };
    const next = { children: createElement("span", { key: "1" }) };
    expect(memoCompareNodes(prev, next)).toBe(false);
  });

  it("returns false for different React element keys", () => {
    const prev = { children: createElement("div", { key: "1" }) };
    const next = { children: createElement("div", { key: "2" }) };
    expect(memoCompareNodes(prev, next)).toBe(false);
  });
});
