import { describe, it, expect } from "vitest";
import { createElement } from "react";
import {
  isEqualToDepth,
  isSameHastValue,
  memoCompareNodes,
} from "../memoization";

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

  it("returns true for the same React element", () => {
    const child = createElement("div", { key: "1" }, "content");
    const prev = { children: child };
    const next = { children: child };
    expect(memoCompareNodes(prev, next)).toBe(true);
  });

  it("returns false when child text changes with the same type and key", () => {
    const prev = { children: createElement("code", { key: "same" }, "old") };
    const next = { children: createElement("code", { key: "same" }, "new") };
    expect(memoCompareNodes(prev, next)).toBe(false);
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

describe("isEqualToDepth", () => {
  it("compares plain objects and arrays by value down to the depth", () => {
    expect(isEqualToDepth({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }, 3)).toBe(
      true,
    );
    expect(isEqualToDepth({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] }, 3)).toBe(
      false,
    );
    expect(isEqualToDepth({ a: { b: 1 } }, { a: { b: 1 } }, 1)).toBe(false);
  });

  it("compares objects that are not plain by identity", () => {
    const date = new Date(1);
    expect(isEqualToDepth({ date }, { date }, 2)).toBe(true);
    expect(
      isEqualToDepth({ date: new Date(1) }, { date: new Date(1) }, 2),
    ).toBe(false);
    expect(isEqualToDepth(new Map([["a", 1]]), new Map([["a", 1]]), 2)).toBe(
      false,
    );
  });
});

describe("isSameHastValue", () => {
  const element = (value: string) => ({
    type: "element",
    tagName: "pre",
    properties: { metastring: value },
    children: [{ type: "text", value }],
    position: { start: { line: 1, column: 1 }, end: { line: 3, column: 4 } },
  });

  it("compares parsed hast by value", () => {
    expect(isSameHastValue(element("a.ts"), element("a.ts"))).toBe(true);
    expect(isSameHastValue(element("a.ts"), element("b.ts"))).toBe(false);
  });

  it("treats cyclic data as changed", () => {
    const cyclic = () => {
      const node: Record<string, unknown> = element("a.ts");
      node["data"] = { owner: node };
      return node;
    };
    expect(isSameHastValue(cyclic(), cyclic())).toBe(false);
  });
});
