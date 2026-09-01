import { describe, expect, it } from "vitest";
import { getGraphemeWidth } from "./textWidth";

const testCases = [
  ["ascii", "a", 1],
  ["emoji", "😀", 2],
  ["CJK", "你", 2],
  ["emoji sequence", "👩‍💻", 2],
  ["combining mark", "e\u0301", 1],
  ["format character", "\u200b", 0],
  ["line break", "\r\n", 0],
] satisfies Array<[string, string, number]>;

describe("getGraphemeWidth", () => {
  it.each(testCases)("measures %s in terminal cells", (_, grapheme, width) => {
    expect(getGraphemeWidth(grapheme)).toBe(width);
  });
});
