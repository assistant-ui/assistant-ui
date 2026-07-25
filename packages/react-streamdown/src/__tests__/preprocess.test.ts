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

  it("escapes currency after an escaped backslash", () => {
    expect(escapeCurrencyDollars("\\\\$5")).toBe("\\\\\\$5");
  });

  it("escapes each amount in a list of prices", () => {
    expect(escapeCurrencyDollars("Prices are $10, $20, and $30.")).toBe(
      "Prices are \\$10, \\$20, and \\$30.",
    );
  });

  it("keeps inline math that opens with a digit", () => {
    expect(
      escapeCurrencyDollars("gives $0$ points, $1$ to the second, up to $m-1$"),
    ).toBe("gives $0$ points, $1$ to the second, up to $m-1$");
  });

  it("keeps an expression that opens with a digit", () => {
    expect(escapeCurrencyDollars("Solve $5x = 10$ for x.")).toBe(
      "Solve $5x = 10$ for x.",
    );
  });

  it("escapes currency but keeps math in the same line", () => {
    expect(escapeCurrencyDollars("Pay $20 when $n=3$ holds.")).toBe(
      "Pay \\$20 when $n=3$ holds.",
    );
  });

  it("does not shift the delimiters that follow an escaped amount", () => {
    expect(escapeCurrencyDollars("costs $5 and $7, and $n$ holds")).toBe(
      "costs \\$5 and \\$7, and $n$ holds",
    );
  });

  it("escapes a currency range", () => {
    expect(escapeCurrencyDollars("Prices: $5-$10 each")).toBe(
      "Prices: \\$5-\\$10 each",
    );
  });

  it("escapes a currency range written with a slash", () => {
    expect(escapeCurrencyDollars("Pay $5/$10 split")).toBe(
      "Pay \\$5/\\$10 split",
    );
  });

  it("does not rewrite a code span", () => {
    expect(escapeCurrencyDollars("Use `$5` as the placeholder.")).toBe(
      "Use `$5` as the placeholder.",
    );
  });

  it("does not rewrite a fenced block", () => {
    expect(escapeCurrencyDollars("```\nconst price = $5;\n```")).toBe(
      "```\nconst price = $5;\n```",
    );
  });

  it("escapes an amount when the prose before the next span carries latex syntax", () => {
    expect(
      escapeCurrencyDollars("Pay $20 when x_1 rises, then $n$ holds"),
    ).toBe("Pay \\$20 when x_1 rises, then $n$ holds");
  });

  it("keeps digit-initial math that carries latex syntax", () => {
    expect(escapeCurrencyDollars("Solve $5x_2 = 10$ now")).toBe(
      "Solve $5x_2 = 10$ now",
    );
  });

  it("escapes a currency range written with a unicode minus", () => {
    expect(escapeCurrencyDollars("Prices: $5\u2212$10 each")).toBe(
      "Prices: \\$5\u2212\\$10 each",
    );
  });

  it("escapes currency after an unclosed backtick", () => {
    expect(escapeCurrencyDollars("see `unclosed then $5 and $7 later")).toBe(
      "see `unclosed then \\$5 and \\$7 later",
    );
  });

  it("escapes currency glued to a preceding word", () => {
    expect(escapeCurrencyDollars("Prices range from US$50 to US$100")).toBe(
      "Prices range from US\\$50 to US\\$100",
    );
  });

  it("escapes an amount whose next dollar opens another amount", () => {
    expect(escapeCurrencyDollars("$50 to US$60")).toBe("\\$50 to US\\$60");
  });
});
