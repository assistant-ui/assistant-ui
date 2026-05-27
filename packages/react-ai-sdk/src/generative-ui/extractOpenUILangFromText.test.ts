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

  it("does not treat inline root mentions in prose as OpenUI Lang", () => {
    const text =
      "OpenUI programs start with a root assignment like root = Card([]) in docs.";
    expect(isOpenUILangText(text)).toBe(false);
    expect(extractOpenUILangFromText(text)).toBeNull();
  });

  it("splits unfenced prose before a root assignment", () => {
    const text = `Here is your UI:\n\n${SAMPLE}`;
    const result = extractOpenUILangFromText(text);
    expect(result?.remainder).toBe("Here is your UI:");
    expect(result?.source).toBe(SAMPLE);
  });

  it("does not send prose prefix as OpenUI source", () => {
    const text = `Intro prose\n\n${SAMPLE}`;
    const result = extractOpenUILangFromText(text);
    expect(result?.source).not.toContain("Intro prose");
    expect(result?.source).toMatch(/^root\s*=/);
  });
});
