// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyPatch, applyPatchOperation, checkPatchOperation } from "./patch";
import { getAtPointer, joinPointer, parsePointer } from "./pointer";

describe("JSON Pointer", () => {
  it("unescapes ~1 before ~0", () => {
    expect(parsePointer("/a~1b/c~0d/~01")).toEqual(["a/b", "c~d", "~1"]);
    expect(parsePointer("")).toEqual([]);
    expect(joinPointer(["a/b", "c~d", 0])).toBe("/a~1b/c~0d/0");
  });

  it("rejects pointers without a leading slash", () => {
    expect(() => parsePointer("a/b")).toThrow(/must start/);
  });

  it("reads nested values and returns undefined for missing steps", () => {
    const doc = { a: [{ b: 1 }], "x/y": 2 };
    expect(getAtPointer(doc, "/a/0/b")).toBe(1);
    expect(getAtPointer(doc, "/x~1y")).toBe(2);
    expect(getAtPointer(doc, "/a/1/b")).toBeUndefined();
    expect(getAtPointer(doc, "/a/-")).toBeUndefined();
    expect(getAtPointer(doc, "/toString")).toBeUndefined();
  });
});

describe("applyPatch", () => {
  it("adds, replaces, and removes without mutating the input", () => {
    const doc = { elements: { a: { type: "Card" } }, keep: { x: 1 } };
    const next = applyPatch(doc, [
      { op: "add", path: "/elements/b", value: { type: "Text" } },
      { op: "replace", path: "/elements/a/type", value: "Panel" },
      { op: "remove", path: "/elements/b" },
    ]);
    expect(next).toEqual({
      elements: { a: { type: "Panel" } },
      keep: { x: 1 },
    });
    expect(doc.elements.a.type).toBe("Card");
    expect(next.keep).toBe(doc.keep);
  });

  it("appends with - and inserts at an index", () => {
    const doc = { list: ["a", "c"] };
    expect(
      applyPatch(doc, [
        { op: "add", path: "/list/-", value: "d" },
        { op: "add", path: "/list/1", value: "b" },
      ]),
    ).toEqual({ list: ["a", "b", "c", "d"] });
  });

  it("moves and copies values", () => {
    const doc = { a: { v: [1] }, b: {} as Record<string, unknown> };
    const moved = applyPatchOperation(doc, {
      op: "move",
      from: "/a/v",
      path: "/b/v",
    });
    expect(moved).toEqual({ a: {}, b: { v: [1] } });
    const copied = applyPatchOperation(doc, {
      op: "copy",
      from: "/a/v",
      path: "/b/w",
    });
    expect(copied.b["w"]).toEqual([1]);
    expect(copied.b["w"]).not.toBe(doc.a.v);
    expect(() =>
      applyPatchOperation(doc, { op: "move", from: "/a", path: "/a/inner" }),
    ).toThrow(/own children/);
  });

  it("tests values deeply", () => {
    const doc = { a: { b: [1, 2] } };
    expect(
      applyPatchOperation(doc, {
        op: "test",
        path: "/a",
        value: { b: [1, 2] },
      }),
    ).toBe(doc);
    expect(() =>
      applyPatchOperation(doc, { op: "test", path: "/a/b/0", value: 2 }),
    ).toThrow(/Test failed/);
  });

  it("fails on missing parents unless createMissing is set", () => {
    expect(() =>
      applyPatchOperation({}, { op: "add", path: "/state/a/b", value: 1 }),
    ).toThrow(/does not exist/);
    expect(
      applyPatchOperation(
        {},
        { op: "add", path: "/state/a/b", value: 1 },
        { createMissing: true },
      ),
    ).toEqual({ state: { a: { b: 1 } } });
    expect(() =>
      applyPatchOperation({ a: 1 }, { op: "remove", path: "/b" }),
    ).toThrow();
    expect(() =>
      applyPatchOperation({ a: [] }, { op: "replace", path: "/a/0", value: 1 }),
    ).toThrow(/out of bounds/);
  });

  it("refuses prototype keys", () => {
    expect(() =>
      applyPatchOperation(
        {},
        { op: "add", path: "/__proto__/x", value: 1 },
        { createMissing: true },
      ),
    ).toThrow(/Forbidden/);
  });

  it("checks operation shape", () => {
    expect(checkPatchOperation({ op: "add", path: "/a", value: 1 }).ok).toBe(
      true,
    );
    expect(checkPatchOperation({ op: "add", path: "/a" })).toEqual({
      ok: false,
      error: '"add" needs a "value"',
    });
    expect(checkPatchOperation({ op: "move", path: "/a" }).ok).toBe(false);
    expect(checkPatchOperation({ op: "merge", path: "/a" }).ok).toBe(false);
    expect(checkPatchOperation([]).ok).toBe(false);
  });
});
