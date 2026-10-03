import { describe, it, expect } from "vitest";
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

  it("detects differences in children", () => {
    const prev = createNode({
      children: [{ type: "text", value: "a" }] as any,
    });
    const next = createNode({
      children: [{ type: "text", value: "b" }] as any,
    });
    expect(areNodesEqual(prev, next)).toBe(false);
  });
});

const createCodeNode = (size: number): Element => ({
  type: "element",
  tagName: "code",
  properties: { className: ["language-ts"] },
  children: [{ type: "text", value: "x".repeat(size) }],
});

describe("streamed code node comparisons", () => {
  it.each([1000, 100000])(
    "compares %i characters without serialization",
    (size) => {
      const prev = createCodeNode(size);
      const next = createCodeNode(size);
      const iterations = 2000;
      const stringify = JSON.stringify;
      let stringifyCalls = 0;
      let equal = true;
      JSON.stringify = (...args: unknown[]): string => {
        stringifyCalls++;
        return Reflect.apply(stringify, JSON, args) as string;
      };
      try {
        for (let i = 0; i < iterations; i++) {
          equal = areNodesEqual(prev, next) && equal;
        }
      } finally {
        JSON.stringify = stringify;
      }
      expect(equal).toBe(true);
      expect(stringifyCalls).toBe(0);
    },
  );

  it("detects a changed character at the end of a large code block", () => {
    const prev = createCodeNode(100000);
    const next = createCodeNode(100000);
    next.children = [{ type: "text", value: `${"x".repeat(99999)}y` }];
    expect(areNodesEqual(prev, next)).toBe(false);
  });

  it("detects a changed language", () => {
    const prev = createCodeNode(100000);
    const next = createCodeNode(100000);
    next.properties.className = ["language-js"];
    expect(areNodesEqual(prev, next)).toBe(false);
  });

  it("compares properties independently of key insertion order", () => {
    const prev = createCodeNode(1000);
    const next = createCodeNode(1000);
    prev.properties = { className: ["language-ts"], title: "code" };
    next.properties = { title: "code", className: ["language-ts"] };
    expect(areNodesEqual(prev, next)).toBe(true);
  });

  it("ignores data when comparing root properties", () => {
    const prev = createNode({
      properties: { title: "code", data: "previous" },
    });
    const next = createNode({ properties: { title: "code", data: "next" } });
    expect(areNodesEqual(prev, next)).toBe(true);
  });

  it("detects changes to nested element properties", () => {
    const prev = createNode({
      children: [createNode({ properties: { title: "a" } })],
    });
    const next = createNode({
      children: [createNode({ properties: { title: "b" } })],
    });
    expect(areNodesEqual(prev, next)).toBe(false);
  });

  it("detects changes to nested node positions", () => {
    const prev = createNode({
      children: [
        {
          type: "text",
          value: "a",
          position: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
      ],
    });
    const next = createNode({
      children: [
        {
          type: "text",
          value: "a",
          position: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 2 },
          },
        },
      ],
    });
    expect(areNodesEqual(prev, next)).toBe(false);
  });
});

describe("structural comparison boundaries", () => {
  it.each<[Element["properties"], Element["properties"]]>([
    [{ className: ["a"] }, { className: ["a", "b"] }],
    [{ className: ["a", "b"] }, { className: ["b", "a"] }],
    [{ title: "a" }, { id: "a" }],
    [{ "data-enabled": null }, { "data-enabled": false }],
  ])("detects changed properties: %j and %j", (prev, next) => {
    expect(
      areNodesEqual(
        createNode({ properties: prev }),
        createNode({ properties: next }),
      ),
    ).toBe(false);
  });

  it("detects an appended child", () => {
    const prev = createCodeNode(1000);
    const next = createCodeNode(1000);
    next.children.push({ type: "text", value: "next" });
    expect(areNodesEqual(prev, next)).toBe(false);
  });

  it("falls back to rendering for cyclic plugin data", () => {
    const prevData: Record<string, unknown> = {};
    const nextData: Record<string, unknown> = {};
    prevData.self = prevData;
    nextData.self = nextData;
    const prev = createNode({
      children: [{ type: "text", value: "a", data: prevData }],
    });
    const next = createNode({
      children: [{ type: "text", value: "a", data: nextData }],
    });
    expect(areNodesEqual(prev, next)).toBe(false);
  });
});
