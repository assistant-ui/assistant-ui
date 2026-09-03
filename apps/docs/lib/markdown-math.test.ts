import {
  escapeCurrencyDollars,
  normalizeMathDelimiters,
} from "@assistant-ui/react-markdown";
import { describe, expect, it } from "vitest";
import {
  closeDisplayMathFences,
  escapeShellVariables,
  mapProse,
  preprocessMath,
} from "./markdown-math";

describe("closeDisplayMathFences", () => {
  it("moves a closing fence that ends an equation line onto its own line", () => {
    expect(
      closeDisplayMathFences("Sum:\n$$\nS = \\frac{a}{1 - r}$$\nDone."),
    ).toBe("Sum:\n$$\nS = \\frac{a}{1 - r}\n$$\nDone.");
  });

  it("moves content that shares the opening fence line onto its own line", () => {
    expect(
      closeDisplayMathFences(
        "Subtract:\n$$S_n - rS_n\n=\n(a+ar+\\cdots+ar^{n-1})\n-\n(ar+\\cdots+ar^n).$$\n\nAll terms cancel.",
      ),
    ).toBe(
      "Subtract:\n$$\nS_n - rS_n\n=\n(a+ar+\\cdots+ar^{n-1})\n-\n(ar+\\cdots+ar^n).\n$$\n\nAll terms cancel.",
    );
  });

  it("leaves a block opened with content and closed by a bare fence", () => {
    expect(closeDisplayMathFences("$$a\n= b\n$$")).toBe("$$\na\n= b\n$$");
  });

  it("leaves one line display math at the start of a line alone", () => {
    expect(closeDisplayMathFences("$$a = b$$\ntext")).toBe("$$a = b$$\ntext");
  });

  it("keeps an aligned environment that opens on the fence line", () => {
    expect(
      closeDisplayMathFences(
        "$$\\begin{aligned}\nS_n-rS_n\n&=(a+ar)\\\\\n&=a-ar^n\n\\end{aligned}$$\nHence, $$\\boxed{S=1}$$",
      ),
    ).toBe(
      "$$\n\\begin{aligned}\nS_n-rS_n\n&=(a+ar)\\\\\n&=a-ar^n\n\\end{aligned}\n$$\nHence, $$\\boxed{S=1}$$",
    );
  });

  it("accepts whitespace before the trailing fence", () => {
    expect(closeDisplayMathFences("$$\nE = mc^2 $$ \nText")).toBe(
      "$$\nE = mc^2\n$$\nText",
    );
  });

  it("closes every block that ends this way", () => {
    expect(closeDisplayMathFences("$$\na$$\n\n$$\nb$$")).toBe(
      "$$\na\n$$\n\n$$\nb\n$$",
    );
  });

  it("handles CRLF line endings", () => {
    expect(closeDisplayMathFences("$$\r\nE = mc^2$$\r\nText")).toBe(
      "$$\r\nE = mc^2\n$$\nText",
    );
  });

  it("leaves a block whose closing fence already stands alone", () => {
    expect(closeDisplayMathFences("$$\na = b\n$$")).toBe("$$\na = b\n$$");
  });

  it("leaves single-line display math alone", () => {
    expect(closeDisplayMathFences("Inline $$a = b$$ here")).toBe(
      "Inline $$a = b$$ here",
    );
  });

  it("does not reopen a block on a stray fence after it closed", () => {
    expect(closeDisplayMathFences("$$\na = b\n$$\nc = d$$")).toBe(
      "$$\na = b\n$$\nc = d$$",
    );
  });

  it("never rewrites fenced code", () => {
    const code = "```latex\n$$\nE = mc^2$$\n```\n$$\nx$$";
    expect(closeDisplayMathFences(code)).toBe(
      "```latex\n$$\nE = mc^2$$\n```\n$$\nx\n$$",
    );
  });

  it("does not treat a fence with an info string as the closing fence", () => {
    const code = "```\n$$\nE = mc^2$$\n```js\n$$\nx$$\n```";
    expect(closeDisplayMathFences(code)).toBe(code);
  });
});

describe("mapProse", () => {
  const upper = (prose: string) => prose.toUpperCase();

  it("transforms prose around fenced code and code spans only", () => {
    expect(
      mapProse("one `two` three\n```js\nfour\n```\nfive ``six`` seven", upper),
    ).toBe("ONE `two` THREE\n```js\nfour\n```\nFIVE ``six`` SEVEN");
  });

  it("treats an unmatched backtick run as prose", () => {
    expect(mapProse("a ` b", upper)).toBe("A ` B");
  });

  it("closes a code span whose content ends with a backslash", () => {
    expect(mapProse("`a\\` b", upper)).toBe("`a\\` B");
  });

  it("ignores escaped backticks", () => {
    expect(mapProse("Use \\` and a and \\` now.", upper)).toBe(
      "USE \\` AND A AND \\` NOW.",
    );
  });

  it("keeps a prose run intact across lines", () => {
    expect(mapProse("a\n\nb", (prose) => prose.replace(/\n\n/g, "|"))).toBe(
      "a|b",
    );
  });
});

describe("escapeShellVariables", () => {
  it("escapes environment variables in prose", () => {
    expect(
      escapeShellVariables(
        "set $OPENAI_API_KEY and $NEXT_PUBLIC_ASSISTANT_BASE_URL, then $HOME",
      ),
    ).toBe(
      "set \\$OPENAI_API_KEY and \\$NEXT_PUBLIC_ASSISTANT_BASE_URL, then \\$HOME",
    );
  });

  it("leaves math and currency alone", () => {
    for (const text of [
      "$x$ and $S_n$ and $X_1 + 2$",
      "$RMSE = \\sqrt{x}$ and $AB_CD + 1$",
      "$$E = mc^2$$",
      "$$\nX_1 + Y\n$$",
      "Costs $5 and $NODE_ENV$",
      "already \\$HOME",
    ]) {
      expect(escapeShellVariables(text)).toBe(text);
    }
  });

  it("defers to inline math that shares the line with a variable", () => {
    for (const text of [
      "The value of $HOME is $x$ here",
      "Export $OPENAI_API_KEY before computing $x$",
    ]) {
      expect(escapeShellVariables(text)).toBe(text);
    }
  });

  it("escapes a lone variable that shares a line with display math", () => {
    expect(escapeShellVariables("set $HOME, then $$x$$")).toBe(
      "set \\$HOME, then $$x$$",
    );
  });
});

describe("preprocessMath", () => {
  it("repairs fences after the delimiter rewrite and before the currency pass", () => {
    const text = "$$\nx$$\nCosts $5 and \\(y\\).";
    expect(preprocessMath(text)).toBe(
      escapeCurrencyDollars(
        closeDisplayMathFences(normalizeMathDelimiters(text)),
      ),
    );
  });

  it("turns a multi-line bracket block into a fenced display block", () => {
    expect(
      preprocessMath(
        "Subtract:\n\\[\n\\begin{aligned}\nS-rS\n&=a\n\\end{aligned}\n\\]\n\nThus \\(S=a\\).",
      ),
    ).toBe(
      "Subtract:\n$$\n\\begin{aligned}\nS-rS\n&=a\n\\end{aligned}\n$$\n\nThus $S=a$.",
    );
  });

  it("leaves LaTeX-looking code alone while normalizing prose", () => {
    const code = "```js\nconst m = text.match(/\\((\\d+)\\)/);\n```";
    expect(
      preprocessMath(`Match \\(n\\) with:\n${code}\nUse \`\\(x\\)\`.`),
    ).toBe(`Match $n$ with:\n${code}\nUse \`\\(x\\)\`.`);
  });

  it("normalizes display math that spans lines", () => {
    expect(preprocessMath("Sum:\n\\[\na = b\n\\]\nDone.")).toBe(
      normalizeMathDelimiters("Sum:\n\\[\na = b\n\\]\nDone."),
    );
  });
});
