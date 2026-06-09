import { describe, expect, it } from "vitest";
import {
  lookupChange,
  markChanged,
  mergeChanged,
  type ChangeNode,
} from "../src/GorpClient";

describe("markChanged", () => {
  it("collapses to true when path is empty", () => {
    expect(markChanged({}, [])).toBe(true);
  });

  it("keeps `true` after attempting to descend into it", () => {
    const node: ChangeNode = { a: true };
    const result = markChanged(node, ["a", "b"]);
    expect(result).toBe(node);
    expect(node.a).toBe(true);
  });

  it("overwrites a nested subtree with `true` when the path collapses to the parent", () => {
    const node: ChangeNode = { a: { b: true } };
    markChanged(node, ["a"]);
    expect(node.a).toBe(true);
  });

  it("creates intermediate nodes lazily without disturbing siblings", () => {
    const node: ChangeNode = { a: { existing: true } };
    markChanged(node, ["a", "b", "c"]);
    expect(node).toEqual({
      a: { existing: true, b: { c: true } },
    });
  });

  it("is a no-op idempotent when the same leaf is marked twice", () => {
    const node: ChangeNode = {};
    markChanged(node, ["a", "b"]);
    markChanged(node, ["a", "b"]);
    expect(node).toEqual({ a: { b: true } });
  });

  it("rejects unsafe path segments", () => {
    const node: ChangeNode = {};
    expect(() => markChanged(node, ["__proto__", "polluted"])).toThrow(
      /Unsafe gorp path segment/,
    );
    expect({}.polluted).toBeUndefined();
  });
});

describe("mergeChanged", () => {
  it("returns true when either side is true", () => {
    expect(mergeChanged(true, {})).toBe(true);
    expect(mergeChanged({}, true)).toBe(true);
  });

  it("merges disjoint subtrees in place", () => {
    const target: ChangeNode = { a: true };
    const source: ChangeNode = { b: true };
    const result = mergeChanged(target, source);
    expect(result).toBe(target);
    expect(target).toEqual({ a: true, b: true });
  });

  it("clones source subtrees before assigning them", () => {
    const target: ChangeNode = {};
    const source: ChangeNode = { a: { b: true } };
    mergeChanged(target, source);
    (source as { a: { c?: true } }).a.c = true;
    expect(target).toEqual({ a: { b: true } });
  });

  it("deep-merges overlapping subtrees", () => {
    const target: ChangeNode = { a: { x: true } };
    const source: ChangeNode = { a: { y: true } };
    mergeChanged(target, source);
    expect(target).toEqual({ a: { x: true, y: true } });
  });

  it("propagates `true` upward when one side has it at a shared key", () => {
    const target: ChangeNode = { a: { x: true } };
    const source: ChangeNode = { a: true };
    mergeChanged(target, source);
    expect(target).toEqual({ a: true });
  });

  it("rejects unsafe source keys", () => {
    const target: ChangeNode = {};
    const source = JSON.parse('{"__proto__":true}') as ChangeNode;
    expect(() => mergeChanged(target, source)).toThrow(
      /Unsafe gorp path segment/,
    );
    expect({}.polluted).toBeUndefined();
  });

  it("rejects nested unsafe source keys before assigning a subtree", () => {
    const target: ChangeNode = {};
    const source = JSON.parse('{"a":{"constructor":true}}') as ChangeNode;
    expect(() => mergeChanged(target, source)).toThrow(
      /Unsafe gorp path segment/,
    );
  });
});

describe("lookupChange", () => {
  it("returns false for paths that don't exist", () => {
    expect(lookupChange({ a: true }, ["b"])).toBe(false);
  });

  it("returns true when traversal hits a `true` sentinel", () => {
    expect(lookupChange({ a: true }, ["a", "b", "c"])).toBe(true);
  });

  it("returns the subtree when the path lands on an interior node", () => {
    const node: ChangeNode = { a: { b: true } };
    const result = lookupChange(node, ["a"]);
    expect(result).toEqual({ b: true });
  });

  it("returns the root node for the empty path", () => {
    const node: ChangeNode = { a: true };
    expect(lookupChange(node, [])).toBe(node);
  });
});
