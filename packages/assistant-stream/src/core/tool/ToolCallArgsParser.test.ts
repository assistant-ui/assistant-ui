import { describe, expect, it, vi } from "vitest";
import { IncrementalJsonScanner } from "streamfold";
import { ToolCallArgsParser } from "./ToolCallArgsParser";
import { ToolCallReaderImpl } from "./ToolCallReader";
import {
  getPartialJsonObjectFieldState,
  parsePartialJsonObject,
} from "../../utils/json/parse-partial-json-object";

const jsonValue = (value: unknown) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const paths = [
  [],
  ["name"],
  ["items"],
  ["items", 0],
  ["items", 1],
  ["items", 0, "name"],
  ["missing"],
];

describe("ToolCallArgsParser compatibility", () => {
  it.each([
    '{"name":"hello","items":[{"name":"one"},{"name":"two"}]}',
    '{"name":"\\uD83D\\uDE00","items":[-1,1.2e-3,true,null]}',
    '{"items":[{"nested":[]},{}],"name":"a\\\"b"}',
    '{"name":"old","name":"new"}',
    '{"name":"ok","__proto__":{"polluted":true}}',
    '{"constructor":{"prototype":{"polluted":true}}}',
    '{"name":"ok","name":"bad\\uZZ"}',
    '{"items":[1,2,]}',
    "null",
    "[]",
  ])("matches legacy values and field states at every prefix of %s", (text) => {
    const parser = new ToolCallArgsParser();
    try {
      for (let end = 0; end <= text.length; end++) {
        const prefix = text.slice(0, end);
        const actual = parser.read(prefix);
        const expected = parsePartialJsonObject(prefix);
        expect(jsonValue(actual), prefix).toEqual(jsonValue(expected));
        if (actual && expected) {
          for (const path of paths) {
            expect(
              getPartialJsonObjectFieldState(actual, path),
              `${prefix}: ${path.join(".")}`,
            ).toBe(getPartialJsonObjectFieldState(expected, path));
          }
        }
      }
    } finally {
      parser.dispose();
    }
  });

  it("keeps earlier nested values and completion metadata stable", () => {
    const parser = new ToolCallArgsParser();
    try {
      const first = parser.read('{"items":[{"name":"a');
      parser.read('{"items":[{"name":"ab"}]}');
      expect(jsonValue(first)).toEqual({ items: [{ name: "a" }] });
      expect(getPartialJsonObjectFieldState(first!, ["items", 0])).toBe(
        "partial",
      );
    } finally {
      parser.dispose();
    }
  });

  it("releases the retained scanner at EOF without completing an unfinished field", async () => {
    const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
    const reader = new ToolCallReaderImpl<{ items: string[] }, string>();
    const items = reader.args.forEach("items");
    await reader.appendArgsTextDelta('{"items":["first","unfinished');
    await reader.finishArgsText();
    const values = [];
    for await (const value of items) values.push(value);
    expect(values).toEqual(["first"]);
    expect(dispose).toHaveBeenCalledOnce();
    dispose.mockRestore();
  });
});
