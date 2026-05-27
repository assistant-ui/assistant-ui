import { describe, expect, it } from "vitest";
import {
  extractOpenUILangFromText,
  isLeakedOpenUILangText,
  isOpenUILangText,
} from "./extractOpenUILangFromText";

const SAMPLE = `root = Card([stack])
stack = Stack([text1, btn1])
text1 = Text("Hello")
btn1 = Button("Click")`;

describe("extractOpenUILangFromText", () => {
  it("detects bare OpenUI Lang", () => {
    expect(isOpenUILangText(SAMPLE)).toBe(true);
    const result = extractOpenUILangFromText(SAMPLE);
    expect(result?.source).toBe(SAMPLE);
    expect(result?.remainder).toBe("");
  });

  it("extracts fenced OpenUI Lang with surrounding markdown", () => {
    const text = `Here is your UI:\n\`\`\`openui\n${SAMPLE}\n\`\`\`\nLet me know if you need changes.`;
    const result = extractOpenUILangFromText(text);
    expect(result?.source).toBe(SAMPLE);
    expect(result?.remainder).toContain("Here is your UI");
    expect(result?.remainder).toContain("Let me know");
  });

  it("returns null for plain markdown", () => {
    expect(extractOpenUILangFromText("Hello **world**")).toBeNull();
    expect(isLeakedOpenUILangText("Hello **world**")).toBe(false);
  });

  it("flags leaked lang text", () => {
    expect(isLeakedOpenUILangText(SAMPLE)).toBe(true);
  });
});
