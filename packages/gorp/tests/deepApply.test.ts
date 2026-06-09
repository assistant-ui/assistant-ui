import { describe, expect, it } from "vitest";
import { deepApply, lookupState } from "../src/internal";

describe("deepApply", () => {
  it("returns the value verbatim for a set at the root", () => {
    const result = deepApply({ old: 1 }, [], {
      type: "set",
      path: [],
      value: { fresh: 2 },
    });
    expect(result).toEqual({ fresh: 2 });
  });

  it("auto-creates missing intermediates when setting on an empty object", () => {
    const result = deepApply({}, ["a", "b"], {
      type: "set",
      path: ["a", "b"],
      value: 42,
    });
    expect(result).toEqual({ a: { b: 42 } });
  });

  it("preserves siblings around a deep set", () => {
    const before = { a: { c: 1 }, d: 2 };
    const after = deepApply(before, ["a", "b"], {
      type: "set",
      path: ["a", "b"],
      value: 99,
    });
    expect(after).toEqual({ a: { c: 1, b: 99 }, d: 2 });
  });

  it("preserves array length and untouched indices when setting one slot", () => {
    const before = ["x", "y", "z"];
    const after = deepApply(before, ["1"], {
      type: "set",
      path: ["1"],
      value: "Y",
    });
    expect(after).toEqual(["x", "Y", "z"]);
  });

  it("treats a missing target as an empty string for append-text", () => {
    const result = deepApply({}, ["a"], {
      type: "append-text",
      path: ["a"],
      value: "hi",
    });
    expect(result).toEqual({ a: "hi" });
  });

  it("concatenates onto an existing string for append-text", () => {
    const result = deepApply({ s: "foo" }, ["s"], {
      type: "append-text",
      path: ["s"],
      value: "bar",
    });
    expect(result).toEqual({ s: "foobar" });
  });

  it("doesn't mutate the input (structural sharing)", () => {
    const before = { a: { b: 1 } };
    const snapshot = JSON.parse(JSON.stringify(before));
    deepApply(before, ["a", "b"], { type: "set", path: ["a", "b"], value: 99 });
    expect(before).toEqual(snapshot);
  });

  it("rejects unsafe path segments", () => {
    expect(() =>
      deepApply({}, ["__proto__", "polluted"], {
        type: "set",
        path: ["__proto__", "polluted"],
        value: true,
      }),
    ).toThrow(/Unsafe gorp path segment/);
    expect({}.polluted).toBeUndefined();
  });
});

describe("lookupState", () => {
  it("returns the value at an existing path", () => {
    expect(lookupState({ a: { b: 7 } }, ["a", "b"])).toBe(7);
  });

  it("returns undefined when traversal walks through null", () => {
    expect(lookupState({ a: null }, ["a", "b"])).toBeUndefined();
  });

  it("returns undefined when traversal walks through a primitive", () => {
    expect(lookupState({ a: "hi" }, ["a", "b"])).toBeUndefined();
  });

  it("returns the root when the path is empty", () => {
    const state = { a: 1 };
    expect(lookupState(state, [])).toBe(state);
  });

  it("rejects unsafe path segments", () => {
    expect(() => lookupState({}, ["constructor", "prototype"])).toThrow(
      /Unsafe gorp path segment/,
    );
  });
});
