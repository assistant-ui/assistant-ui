import { describe, expect, it } from "vitest";
import { isJSONValue, isRecord } from "./is-json";

const wrapInArrays = (value: unknown, depth: number): unknown => {
  let result = value;
  for (let i = 0; i < depth; i++) result = [result];
  return result;
};

describe("isRecord", () => {
  it("accepts plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("accepts class instances", () => {
    class Point {
      x = 1;
    }
    expect(isRecord(new Point())).toBe(true);
  });

  it("rejects null, arrays, and primitives", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
  });
});

describe("isJSONValue", () => {
  it("accepts JSON primitives", () => {
    expect(isJSONValue(null)).toBe(true);
    expect(isJSONValue("text")).toBe(true);
    expect(isJSONValue(true)).toBe(true);
    expect(isJSONValue(false)).toBe(true);
    expect(isJSONValue(0)).toBe(true);
    expect(isJSONValue(-1.5)).toBe(true);
  });

  it("rejects non-finite numbers", () => {
    expect(isJSONValue(NaN)).toBe(false);
    expect(isJSONValue(Infinity)).toBe(false);
    expect(isJSONValue(-Infinity)).toBe(false);
  });

  it("rejects non-JSON primitives", () => {
    expect(isJSONValue(undefined)).toBe(false);
    expect(isJSONValue(() => {})).toBe(false);
    expect(isJSONValue(Symbol("s"))).toBe(false);
    expect(isJSONValue(10n)).toBe(false);
  });

  it("recurses through nested arrays and objects", () => {
    expect(isJSONValue({ a: [1, { b: "c", d: [null, true] }] })).toBe(true);
  });

  it("rejects a non-JSON leaf nested deep inside", () => {
    expect(isJSONValue({ a: [{ b: undefined }] })).toBe(false);
    expect(isJSONValue({ a: [{ b: () => {} }] })).toBe(false);
  });

  it("accepts nesting up to depth 100 and rejects depth 101", () => {
    expect(isJSONValue(wrapInArrays(1, 100))).toBe(true);
    expect(isJSONValue(wrapInArrays(1, 101))).toBe(false);
  });

  it("accepts non-plain objects without own enumerable string keys", () => {
    expect(isJSONValue(new Date())).toBe(true);
    expect(isJSONValue(new Map([["a", 1]]))).toBe(true);
    expect(isJSONValue(new Set([1]))).toBe(true);
  });

  it("accepts objects whose only keys are symbols", () => {
    expect(isJSONValue({ [Symbol("s")]: () => {} })).toBe(true);
  });
});
