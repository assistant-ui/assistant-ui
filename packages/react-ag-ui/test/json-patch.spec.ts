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
    expect(result).toBe(doc);
  });

  it("should splice-insert (not overwrite) when 'move' targets an array index", () => {
    const doc = { src: "x", items: ["a", "b", "c"] };
    const result = applyJsonPatch(doc, [
      { op: "move", from: "/src", path: "/items/1" },
    ]);
    expect(result).toEqual({ items: ["a", "x", "b", "c"] });
  });

  it("should splice-insert (not overwrite) when 'copy' targets an array index", () => {
    const doc = { src: "x", items: ["a", "b", "c"] };
    const result = applyJsonPatch(doc, [
      { op: "copy", from: "/src", path: "/items/1" },
    ]);
    expect(result).toEqual({ src: "x", items: ["a", "x", "b", "c"] });
  });

  it("should throw a descriptive error when 'move' lacks 'from'", () => {
    expect(() =>
      applyJsonPatch({ a: 1 }, [{ op: "move", path: "/b" } as any]),
    ).toThrow(/'move' op requires a 'from'/);
  });

  it("should throw a descriptive error when 'copy' lacks 'from'", () => {
    expect(() =>
      applyJsonPatch({ a: 1 }, [{ op: "copy", path: "/b" } as any]),
    ).toThrow(/'copy' op requires a 'from'/);
  });

  it("should throw when 'replace' targets a non-existent path", () => {
    expect(() =>
      applyJsonPatch({ a: 1 }, [{ op: "replace", path: "/b", value: 2 }]),
    ).toThrow(/Path not found/);
  });

  it("should throw when 'move' source does not exist", () => {
    expect(() =>
      applyJsonPatch({ a: 1 }, [{ op: "move", from: "/missing", path: "/b" }]),
    ).toThrow(/Path not found/);
  });

  it("should throw when 'copy' source does not exist", () => {
    expect(() =>
      applyJsonPatch({ a: 1 }, [{ op: "copy", from: "/missing", path: "/b" }]),
    ).toThrow(/Path not found/);
  });

  it("should throw on an unknown op", () => {
    expect(() =>
      applyJsonPatch({ a: 1 }, [{ op: "increment", path: "/a" } as any]),
    ).toThrow(/Unknown JSON Patch op/);
  });

  it("should pass 'test' regardless of object key order", () => {
    const doc = { obj: { a: 1, b: 2 } };
    expect(() =>
      applyJsonPatch(doc, [
        { op: "test", path: "/obj", value: { b: 2, a: 1 } },
      ]),
    ).not.toThrow();
  });

  it("should throw when 'remove' targets a non-existent key", () => {
    expect(() =>
      applyJsonPatch({ a: 1 }, [{ op: "remove", path: "/b" }]),
    ).toThrow(/Path not found/);
  });

  it("should throw when 'remove' uses an out-of-range array index", () => {
    expect(() =>
      applyJsonPatch({ items: ["a"] }, [{ op: "remove", path: "/items/5" }]),
    ).toThrow(/Path not found/);
  });

  it("should throw when 'add' uses a non-integer array index", () => {
    expect(() =>
      applyJsonPatch({ items: ["a"] }, [
        { op: "add", path: "/items/x", value: "b" },
      ]),
    ).toThrow(/Invalid array index/);
  });

  it("should throw when 'add' index is past the end of the array", () => {
    expect(() =>
      applyJsonPatch({ items: ["a"] }, [
        { op: "add", path: "/items/5", value: "b" },
      ]),
    ).toThrow(/Invalid array index/);
  });

  it("should include the failing path in 'test'/'copy' lookup errors", () => {
    expect(() =>
      applyJsonPatch({ a: { b: 1 } }, [
        { op: "test", path: "/a/missing/leaf", value: 1 },
      ]),
    ).toThrow(/Path not found: a\/missing/);
  });
});
