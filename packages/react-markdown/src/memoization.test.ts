import { describe, it, expect, vi } from "vitest";
import type { Element } from "hast";
import { areNodesEqual } from "./memoization";

const createNode = (overrides: Partial<Element> = {}): Element => ({
  type: "element",
  tagName: "p",
  properties: { className: ["foo"] },
  children: [],
  ...overrides,
});

describe("areNodesEqual", () => {
  it("returns false if either node is undefined", () => {
    expect(areNodesEqual(undefined, createNode())).toBe(false);
    expect(areNodesEqual(createNode(), undefined)).toBe(false);
  });

  it("ignores position when comparing properties", () => {
    const prev = createNode({
      properties: { className: ["foo"], position: 1 },
    });
    const next = createNode({
      properties: { className: ["foo"], position: 2 },
    });
    expect(areNodesEqual(prev, next)).toBe(true);
  });

  it("ignores data and property key order", () => {
    const prev = createNode({
      properties: {
        className: ["foo"],
        title: "title",
        position: 1,
        data: "first",
      },
    });
    const next = createNode({
      properties: {
        data: "second",
        position: 2,
        title: "title",
        className: ["foo"],
      },
    });
    expect(areNodesEqual(prev, next)).toBe(true);
  });

  it("returns true for the same node reference", () => {
    const node = createNode({
      children: [{ type: "text", value: "a" }] as any,
    });
    expect(areNodesEqual(node, node)).toBe(true);
  });

  it("detects differences in children", () => {
    const prev = createNode({
      children: [{ type: "text", value: "a" }] as any,
    });
    const next = createNode({
      children: [{ type: "text", value: "b" }] as any,
    });
    expect(areNodesEqual(prev, next)).toBe(false);
  });

  it("detects differences in properties and nested children", () => {
    const prev = createNode({
      properties: { className: ["foo"], title: "before" },
      children: [
        {
          type: "element",
          tagName: "em",
          properties: {},
          children: [{ type: "text", value: "nested" }],
        },
      ] as any,
    });
    const changedProperties = createNode({
      properties: { className: ["foo"], title: "after" },
      children: prev.children,
    });
    const changedChildren = createNode({
      properties: prev.properties,
      children: [
        {
          type: "element",
          tagName: "em",
          properties: {},
          children: [{ type: "text", value: "changed" }],
        },
      ] as any,
    });

    expect(areNodesEqual(prev, changedProperties)).toBe(false);
    expect(areNodesEqual(prev, changedChildren)).toBe(false);
  });

  it("detects array shape changes", () => {
    const prev = createNode({ properties: { className: ["foo"] } });
    const changedLength = createNode({
      properties: { className: ["foo", "bar"] },
    });
    const changedType = createNode({
      properties: { className: "foo" as any },
    });

    expect(areNodesEqual(prev, changedLength)).toBe(false);
    expect(areNodesEqual(prev, changedType)).toBe(false);
  });

  it("does not serialize values while comparing", () => {
    const stringify = vi.spyOn(JSON, "stringify");
    const prev = createNode({
      children: [{ type: "text", value: "x".repeat(10_000) }] as any,
    });
    const next = createNode({
      children: [{ type: "text", value: "x".repeat(10_000) }] as any,
    });

    try {
      expect(areNodesEqual(prev, next)).toBe(true);
      expect(stringify).not.toHaveBeenCalled();
    } finally {
      stringify.mockRestore();
    }
  });
});
