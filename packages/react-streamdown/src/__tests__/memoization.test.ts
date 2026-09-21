import { describe, it, expect } from "vitest";
import { createElement } from "react";
import {
  isEqualToDepth,
  isSameHastNode,
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

  it("compares values outside the JSON shape by identity", () => {
    const symbolKeyed = () => ({ [Symbol.for("a")]: 1 });
    const nonEnumerable = () => Object.defineProperty({}, "a", { value: 1 });
    const extendedArray = () => Object.assign([1], { extra: 1 });
    const sparseArray = () => Object.assign(new Array(1), { extra: 1 });
    class List extends Array<number> {}
    const subclassArray = () => List.from([1]);
    const hiddenIndex = () =>
      Object.defineProperty([0], 0, { value: 1, enumerable: false });

    expect(isEqualToDepth(symbolKeyed(), symbolKeyed(), 2)).toBe(false);
    expect(isEqualToDepth(nonEnumerable(), nonEnumerable(), 2)).toBe(false);
    expect(isEqualToDepth(extendedArray(), extendedArray(), 2)).toBe(false);
    expect(isEqualToDepth(sparseArray(), sparseArray(), 2)).toBe(false);
    expect(isEqualToDepth(subclassArray(), subclassArray(), 2)).toBe(false);
    expect(isEqualToDepth(hiddenIndex(), hiddenIndex(), 2)).toBe(false);
    expect(isEqualToDepth([1, { a: 1 }], [1, { a: 1 }], 2)).toBe(true);
  });

  it("reports a change once a comparison exceeds its step budget", () => {
    let childKeyReads = 0;
    const wide = () => {
      const child = new Proxy(
        Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`k${i}`, i]),
        ),
        {
          ownKeys: (target) => {
            childKeyReads += 1;
            return Reflect.ownKeys(target);
          },
        },
      );
      return Object.fromEntries(
        Array.from({ length: 1000 }, (_, i) => [`k${i}`, child]),
      );
    };

    expect(isEqualToDepth(wide(), wide(), 2)).toBe(false);
    expect(childKeyReads).toBeLessThan(1000);
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

describe("isSameHastNode", () => {
  const element = (meta: string, data?: unknown) => ({
    type: "element",
    tagName: "pre",
    properties: { className: ["shiki"] },
    children: [
      {
        type: "element",
        tagName: "code",
        properties: { metastring: meta },
        children: [{ type: "text", value: "const x = 1;" }],
        ...(data !== undefined && { data }),
      },
    ],
    position: { start: { line: 1, column: 1 }, end: { line: 3, column: 4 } },
  });

  it("compares parsed hast by value", () => {
    expect(isSameHastNode(element("a.ts"), element("a.ts"))).toBe(true);
    expect(isSameHastNode(element("a.ts"), element("b.ts"))).toBe(false);
    expect(
      isSameHastNode(
        element("a.ts", { meta: "a.ts" }),
        element("a.ts", { meta: "a.ts" }),
      ),
    ).toBe(true);
  });

  it("compares deeply nested markup without a depth limit", () => {
    const nested = () => {
      let node: Record<string, unknown> = { type: "text", value: "x" };
      for (let level = 0; level < 100; level++) {
        node = {
          type: "element",
          tagName: "span",
          properties: {},
          children: [node],
        };
      }
      return node;
    };
    expect(isSameHastNode(nested(), nested())).toBe(true);
  });

  it("compares plugin data nested past one level by identity", () => {
    const cyclic = () => {
      const data: Record<string, unknown> = {};
      data["owner"] = data;
      return data;
    };
    const shared = () => {
      let graph: Record<string, unknown> = { value: 1 };
      for (let level = 0; level < 64; level++) {
        graph = { left: graph, right: graph };
      }
      return { graph };
    };

    expect(
      isSameHastNode(
        element("a.ts", { stamp: new Date(1) }),
        element("a.ts", { stamp: new Date(1) }),
      ),
    ).toBe(false);
    expect(
      isSameHastNode(element("a.ts", cyclic()), element("a.ts", cyclic())),
    ).toBe(false);
    expect(
      isSameHastNode(element("a.ts", shared()), element("a.ts", shared())),
    ).toBe(false);
  });
});
