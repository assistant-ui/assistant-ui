import { describe, expect, it } from "vitest";
import { isJSONValueEqual } from "./is-json-equal";

const wrapInArrays = (value: unknown, depth: number): unknown => {
  let result = value;
  for (let i = 0; i < depth; i++) result = [result];
  return result;
};

describe("isJSONValueEqual", () => {
  it("compares primitives", () => {
    expect(isJSONValueEqual(1, 1)).toBe(true);
    expect(isJSONValueEqual("a", "a")).toBe(true);
    expect(isJSONValueEqual(null, null)).toBe(true);
    expect(isJSONValueEqual(1, 2)).toBe(false);
    expect(isJSONValueEqual(0, "0")).toBe(false);
    expect(isJSONValueEqual(true, 1)).toBe(false);
  });

  it("rejects non-JSON inputs on either side", () => {
    expect(isJSONValueEqual(NaN, NaN)).toBe(false);
    expect(isJSONValueEqual(undefined, undefined)).toBe(false);
    expect(
      isJSONValueEqual(
        () => {},
        () => {},
      ),
    ).toBe(false);
    expect(isJSONValueEqual({ a: 1 }, { a: NaN })).toBe(false);
  });

  it("compares objects independent of key insertion order", () => {
    expect(isJSONValueEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("rejects differing key sets in both directions", () => {
    expect(isJSONValueEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isJSONValueEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    expect(isJSONValueEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("compares arrays order-sensitively", () => {
    expect(isJSONValueEqual([1, 2], [1, 2])).toBe(true);
    expect(isJSONValueEqual([1, 2], [2, 1])).toBe(false);
    expect(isJSONValueEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("compares nested mixed structures", () => {
    const make = () => ({ a: [1, { b: "c", d: [null, true] }], e: {} });
    expect(isJSONValueEqual(make(), make())).toBe(true);
    expect(
      isJSONValueEqual(make(), {
        a: [1, { b: "c", d: [null, false] }],
        e: {},
      }),
    ).toBe(false);
  });

  it("rejects array vs object and null vs empty object", () => {
    expect(isJSONValueEqual([], {})).toBe(false);
    expect(isJSONValueEqual({}, [])).toBe(false);
    expect(isJSONValueEqual(null, {})).toBe(false);
  });

  it("compares reference-identical structures within the depth limit", () => {
    const value = wrapInArrays({ a: 1 }, 99);
    expect(isJSONValueEqual(value, value)).toBe(true);
  });

  it("rejects inputs nested beyond depth 100 regardless of identity", () => {
    const value = wrapInArrays(1, 101);
    expect(isJSONValueEqual(value, value)).toBe(false);
  });

  it("compares structurally equal distinct structures at depth 100", () => {
    expect(isJSONValueEqual(wrapInArrays(1, 100), wrapInArrays(1, 100))).toBe(
      true,
    );
  });

  it("treats distinct empty-record instances as equal", () => {
    expect(isJSONValueEqual(new Date(0), new Date(0))).toBe(true);
  });
});
