import { describe, expect, it } from "vitest";
import {
  stableStringifyToolArgs,
  trackToolArgsKeyOrder,
} from "./stable-stringify-tool-args";

describe("stableStringifyToolArgs", () => {
  it("stringifies without a cache", () => {
    expect(stableStringifyToolArgs(undefined, "key", { a: 1, b: 2 })).toBe(
      JSON.stringify({ a: 1, b: 2 }),
    );
  });

  it("keeps first-seen key order across reordered updates", () => {
    const cache = new Map<string, Map<string, string[]>>();
    stableStringifyToolArgs(cache, "key", { a: 1, b: 2 });
    expect(stableStringifyToolArgs(cache, "key", { b: 3, a: 4 })).toBe(
      JSON.stringify({ a: 4, b: 3 }),
    );
  });

  it("appends new keys after previously seen keys", () => {
    const cache = new Map<string, Map<string, string[]>>();
    stableStringifyToolArgs(cache, "key", { b: 1 });
    expect(stableStringifyToolArgs(cache, "key", { c: 2, a: 3, b: 4 })).toBe(
      JSON.stringify({ b: 4, c: 2, a: 3 }),
    );
  });

  it("drops keys absent from the current value", () => {
    const cache = new Map<string, Map<string, string[]>>();
    stableStringifyToolArgs(cache, "key", { a: 1, b: 2 });
    expect(stableStringifyToolArgs(cache, "key", { b: 3 })).toBe(
      JSON.stringify({ b: 3 }),
    );
    expect(stableStringifyToolArgs(cache, "key", { a: 5, b: 6 })).toBe(
      JSON.stringify({ b: 6, a: 5 }),
    );
  });

  it("stabilizes nested objects and array elements independently", () => {
    const cache = new Map<string, Map<string, string[]>>();
    stableStringifyToolArgs(cache, "key", {
      list: [{ x: 1, y: 2 }],
      nested: { p: 1, q: 2 },
    });
    expect(
      stableStringifyToolArgs(cache, "key", {
        nested: { q: 3, p: 4 },
        list: [{ y: 5, x: 6 }],
      }),
    ).toBe(
      JSON.stringify({
        list: [{ x: 6, y: 5 }],
        nested: { p: 4, q: 3 },
      }),
    );
  });

  it("keeps caches per cacheKey independent", () => {
    const cache = new Map<string, Map<string, string[]>>();
    stableStringifyToolArgs(cache, "one", { a: 1, b: 2 });
    expect(stableStringifyToolArgs(cache, "two", { b: 3, a: 4 })).toBe(
      JSON.stringify({ b: 3, a: 4 }),
    );
  });
});

describe("trackToolArgsKeyOrder", () => {
  it("seeds the order a later stringify follows", () => {
    const cache = new Map<string, Map<string, string[]>>();
    trackToolArgsKeyOrder(cache, "key", { b: 1, a: 2 });
    expect(stableStringifyToolArgs(cache, "key", { a: 3, b: 4 })).toBe(
      JSON.stringify({ b: 4, a: 3 }),
    );
  });

  it("is a no-op without a cache", () => {
    expect(() =>
      trackToolArgsKeyOrder(undefined, "key", { a: 1 }),
    ).not.toThrow();
  });
});
