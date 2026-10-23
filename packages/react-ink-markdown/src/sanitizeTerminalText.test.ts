import { describe, expect, it } from "vitest";
import { sanitizeTerminalText } from "./sanitizeTerminalText";

describe("sanitizeTerminalText", () => {
  it.each([
    [
      "OSC 8 with BEL",
      "a\x1b]8;;https://wrong.example\x07b\x1b]8;;\x07c",
      "abc",
    ],
    [
      "OSC 8 with ST",
      "a\x1b]8;;https://wrong.example\x1b\\b\x1b]8;;\x1b\\c",
      "abc",
    ],
    ["OSC 52", "a\x1b]52;c;YWJj\x07b", "ab"],
    ["CSI cursor movement", "a\x1b[12;4Hb", "ab"],
    ["C1 OSC and ST", "a\u009d8;;https://wrong.example\u009cb", "ab"],
    ["BEL", "a\x07b", "ab"],
    ["DCS", "a\x1bPignored\x1b\\b", "ab"],
    ["SOS", "a\x1bXignored\x1b\\b", "ab"],
    ["PM", "a\x1b^ignored\x1b\\b", "ab"],
    ["APC", "a\x1b_ignored\x1b\\b", "ab"],
    ["two character escape", "a\x1b7b", "ab"],
    [
      "C0 and C1 while retaining tab and newline",
      "a\x00\x1f\x7f\x80\tb\nc",
      "a\tb\nc",
    ],
    ["unfinished OSC", "a\x1b]8;;https://wrong.example", "a"],
    ["unfinished CSI", "a\x1b[12;", "a"],
  ])("removes %s", (_name, input, expected) => {
    expect(sanitizeTerminalText(input)).toBe(expected);
  });

  it.each([
    ["a newline after a malformed CSI", "a\x1b[\nb", "a\nb"],
    ["CJK text after a malformed CSI", "a\x1b[12你好", "a你好"],
    ["CJK text after a malformed C1 CSI", "a\u009b你好", "a你好"],
  ])("keeps %s", (_name, input, expected) => {
    expect(sanitizeTerminalText(input)).toBe(expected);
  });
});
