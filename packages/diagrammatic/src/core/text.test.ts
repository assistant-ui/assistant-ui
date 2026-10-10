import { describe, expect, it } from "vitest";
import { charsThatFit, textWidth, truncate } from "./text";

describe("textWidth", () => {
  it("measures the monospace advance", () => {
    expect(textWidth("abcd", 4)).toBeCloseTo(9.6);
    expect(textWidth("", 4)).toBe(0);
  });
});

describe("charsThatFit", () => {
  it("counts whole characters only", () => {
    expect(charsThatFit(10, 3.2)).toBe(5);
    expect(charsThatFit(0, 3.2)).toBe(0);
    expect(charsThatFit(10, 0)).toBe(0);
  });
});

describe("truncate", () => {
  it("leaves a label that fits alone", () => {
    expect(truncate("react", 3.2, 40)).toBe("react");
  });

  it("cuts to the width and marks the cut", () => {
    const cut = truncate("anthropic/claude-opus-5-preview", 3.2, 20);
    expect(cut.endsWith("…")).toBe(true);
    expect(textWidth(cut, 3.2)).toBeLessThanOrEqual(20);
  });

  it("draws nothing rather than a lone ellipsis", () => {
    expect(truncate("react", 3.2, 3)).toBe("");
    expect(truncate("react", 3.2, 0)).toBe("");
  });
});
