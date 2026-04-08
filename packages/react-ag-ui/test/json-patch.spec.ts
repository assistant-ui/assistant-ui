import { describe, it, expect } from "vitest";
import { applyJsonPatch } from "../src/runtime/json-patch";

describe("applyJsonPatch", () => {
  it("should apply 'replace' operation", () => {
    const doc = { count: 1, name: "test" };
    const result = applyJsonPatch(doc, [
      { op: "replace", path: "/count", value: 42 },
    ]);
    expect(result).toEqual({ count: 42, name: "test" });
  });

  it("should apply 'add' operation", () => {
    const doc = { items: ["a"] };
    const result = applyJsonPatch(doc, [
      { op: "add", path: "/items/-", value: "b" },
    ]);
    expect(result).toEqual({ items: ["a", "b"] });
  });

  it("should apply 'add' to nested path", () => {
    const doc = { a: {} };
    const result = applyJsonPatch(doc, [{ op: "add", path: "/a/b", value: 1 }]);
    expect(result).toEqual({ a: { b: 1 } });
  });

  it("should apply 'remove' operation", () => {
    const doc = { a: 1, b: 2 };
    const result = applyJsonPatch(doc, [{ op: "remove", path: "/b" }]);
    expect(result).toEqual({ a: 1 });
  });

  it("should apply 'move' operation", () => {
    const doc = { a: 1, b: { c: 2 } };
    const result = applyJsonPatch(doc, [
      { op: "move", from: "/b/c", path: "/d" },
    ]);
    expect(result).toEqual({ a: 1, b: {}, d: 2 });
  });

  it("should apply 'copy' operation", () => {
    const doc = { a: 1 };
    const result = applyJsonPatch(doc, [
      { op: "copy", from: "/a", path: "/b" },
    ]);
    expect(result).toEqual({ a: 1, b: 1 });
  });

  it("should apply 'test' operation (passes)", () => {
    const doc = { a: 1 };
    expect(() =>
      applyJsonPatch(doc, [{ op: "test", path: "/a", value: 1 }]),
    ).not.toThrow();
  });

  it("should throw on failing 'test' operation", () => {
    const doc = { a: 1 };
    expect(() =>
      applyJsonPatch(doc, [{ op: "test", path: "/a", value: 2 }]),
    ).toThrow();
  });

  it("should apply multiple operations in order", () => {
    const doc = { count: 0 };
    const result = applyJsonPatch(doc, [
      { op: "replace", path: "/count", value: 1 },
      { op: "add", path: "/name", value: "test" },
    ]);
    expect(result).toEqual({ count: 1, name: "test" });
  });

  it("should handle root replacement", () => {
    const doc = { old: true };
    const result = applyJsonPatch(doc, [
      { op: "replace", path: "", value: { new: true } },
    ]);
    expect(result).toEqual({ new: true });
  });

  it("should return original document if patch is empty", () => {
    const doc = { a: 1 };
    const result = applyJsonPatch(doc, []);
    expect(result).toEqual({ a: 1 });
  });
});
