import { describe, expect, it } from "vitest";
import { hasMath } from "./markdown-text";

describe("hasMath", () => {
  it("detects every math syntax the preprocessor understands", () => {
    expect(hasMath("Euler: $e^{i\\pi} + 1 = 0$")).toBe(true);
    expect(hasMath("$$\nx^2\n$$")).toBe(true);
    expect(hasMath("inline \\(x^2\\) here")).toBe(true);
    expect(hasMath("display \\[x^2\\] here")).toBe(true);
    expect(hasMath("[/math]x^2[/math]")).toBe(true);
    expect(hasMath("[/inline]x[/inline]")).toBe(true);
  });

  it("ignores text without math, including currency", () => {
    expect(hasMath("Plain reply with `code`.")).toBe(false);
    expect(hasMath("It costs $5 and the pro plan is $20 a month.")).toBe(false);
  });
});
