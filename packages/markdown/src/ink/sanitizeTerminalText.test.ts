import { describe, expect, it } from "vitest";
import { sanitizeTerminalText } from "./sanitizeTerminalText";

describe("sanitizeTerminalText", () => {
  it.each([
    ["a terminated DCS across lines", "a\x1bPignored\npayload\x1b\\b", "ab"],
    ["a terminated OSC across lines", "a\x1b]0;x\ny\x07b", "ab"],
    ["an unfinished OSC", "a\x1b]8;;https://wrong.example", "a"],
  ])("removes %s", (_name, input, expected) => {
    expect(sanitizeTerminalText(input)).toBe(expected);
  });

  it.each([
    [
      "the lines after an unterminated OSC",
      "a\x1b]8;;https://wrong.example\nb\nc",
      "a\nb\nc",
    ],
    ["the lines after an unterminated DCS", "a\x1bPignored\nb", "a\nb"],
    ["the lines after an unterminated C1 OSC", "a\u009dhidden\nb", "a\nb"],
  ])("keeps %s", (_name, input, expected) => {
    expect(sanitizeTerminalText(input)).toBe(expected);
  });
});
