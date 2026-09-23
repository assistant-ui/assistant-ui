import { createRenderCounter } from "@assistant-ui/x-performance";
import { describe, expect, it } from "vitest";
import { getInlineJson } from "./getInlineJson";

describe("getInlineJson", () => {
  it("preserves JSON output and the exact inline length boundary", () => {
    const values: unknown[] = [
      null,
      true,
      false,
      0,
      NaN,
      Infinity,
      {},
      [],
      undefined,
    ];
    for (const size of [0, 1, 20, 42, 43, 44, 85, 86, 87, 88, 89, 100]) {
      for (const char of ["x", "\n", '"', "\\", "😀", "\ud800"]) {
        const text = char.repeat(size);
        values.push(text, { text }, { nested: { text } }, [text]);
      }
      values.push(
        Array(size).fill(0),
        Array(size),
        Object.fromEntries(
          Array.from({ length: size }, (_, i) => [String(i), undefined]),
        ),
      );
    }
    values.push({
      omitted: undefined,
      fn: () => {},
      symbol: Symbol(),
      kept: "yes",
    });
    values.push(new Date("2026-01-01T00:00:00.000Z"));
    values.push({ toJSON: () => ({ short: true }) });
    const customArray = Object.assign(Array(100).fill(0), {
      toJSON: () => "short",
    });
    values.push(customArray);
    for (const value of values) {
      const serialized = JSON.stringify(value);
      expect(getInlineJson(value, 88)).toBe(
        serialized !== undefined && serialized.length <= 88
          ? serialized
          : undefined,
      );
    }
  });

  it("stops reading a large object after the preview budget is exhausted", () => {
    const counter = createRenderCounter();
    const value: Record<string, number> = {};
    for (let index = 0; index < 10_000; index++) {
      Object.defineProperty(value, `row${index}`, {
        enumerable: true,
        get: () => {
          counter.useRender("entry");
          return index;
        },
      });
    }
    expect(getInlineJson(value, 88)).toBeUndefined();
    expect(counter.renders("entry")).toBe(17);
  });

  it("does not turn unrelated serialization errors into a large preview", () => {
    const failure = new Error("serialization failed");
    expect(() =>
      getInlineJson(
        {
          toJSON: () => {
            throw failure;
          },
        },
        88,
      ),
    ).toThrow(failure);
    expect(() => getInlineJson({ value: 1n }, 88)).toThrow(TypeError);
  });
});
