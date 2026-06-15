import { describe, it, expect } from "vitest";
import {
  rewriteLatexBracketDelimiters,
  rewriteCustomMathTags,
  normalizeMathDelimiters,
  escapeCurrencyDollars,
} from "../preprocess";

describe("rewriteLatexBracketDelimiters", () => {
  it("rewrites inline brackets to single dollars", () => {
    expect(rewriteLatexBracketDelimiters("a \\(x^2\\) b")).toBe("a $x^2$ b");
  });

  it("rewrites display brackets to double dollars", () => {
    expect(rewriteLatexBracketDelimiters("\\[a + b\\]")).toBe("$$a + b$$");
  });

  it("accepts a double leading backslash", () => {
    expect(rewriteLatexBracketDelimiters("\\\\(x\\\\)")).toBe("$x$");
  });

  it("trims the captured body", () => {
    expect(rewriteLatexBracketDelimiters("\\( x \\)")).toBe("$x$");
  });

  it("spans newlines only for display math", () => {
    expect(rewriteLatexBracketDelimiters("\\[a\nb\\]")).toBe("$$a\nb$$");
    expect(rewriteLatexBracketDelimiters("\\(a\nb\\)")).toBe("\\(a\nb\\)");
  });

  it("leaves text without bracket delimiters untouched", () => {
    expect(rewriteLatexBracketDelimiters("plain $x$ text")).toBe(
      "plain $x$ text",
    );
  });
});

describe("rewriteCustomMathTags", () => {
  it("rewrites [/math] to display dollars and [/inline] to inline dollars", () => {
    expect(
      rewriteCustomMathTags("[/math]a+b[/math] and [/inline]c[/inline]"),
    ).toBe("$$a+b$$ and $c$");
  });
});

describe("normalizeMathDelimiters", () => {
  it("normalizes both bracket delimiters and custom tags", () => {
    expect(normalizeMathDelimiters("\\(x\\) [/math]y[/math]")).toBe(
      "$x$ $$y$$",
    );
  });
});

describe("escapeCurrencyDollars", () => {
  it("escapes a dollar followed by a digit", () => {
    expect(escapeCurrencyDollars("it costs $5 and $10.")).toBe(
      "it costs \\$5 and \\$10.",
    );
  });

  it("escapes currency at the start of the string", () => {
    expect(escapeCurrencyDollars("$1,299 total")).toBe("\\$1,299 total");
  });

  it("leaves display math intact", () => {
    expect(escapeCurrencyDollars("$$5x$$")).toBe("$$5x$$");
  });

  it("does not touch a dollar followed by a letter", () => {
    expect(escapeCurrencyDollars("$x$")).toBe("$x$");
  });

  it("does not double-escape an already escaped dollar", () => {
    expect(escapeCurrencyDollars("already \\$5")).toBe("already \\$5");
  });
});
