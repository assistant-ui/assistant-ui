import {
  escapeCurrencyDollars,
  normalizeMathDelimiters,
} from "@assistant-ui/react-markdown";
import { describe, expect, it } from "vitest";
import { closeDisplayMathFences, preprocessMath } from "./markdown-math";

describe("closeDisplayMathFences", () => {
  it("moves a closing fence that ends an equation line onto its own line", () => {
    expect(
      closeDisplayMathFences("Sum:\n$$\nS = \\frac{a}{1 - r}$$\nDone."),
    ).toBe("Sum:\n$$\nS = \\frac{a}{1 - r}\n$$\nDone.");
  });

  it("closes every block that ends this way", () => {
    expect(closeDisplayMathFences("$$\na$$\n\n$$\nb$$")).toBe(
      "$$\na\n$$\n\n$$\nb\n$$",
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
});

describe("preprocessMath", () => {
  it("closes fences before the shared delimiter and currency passes", () => {
    const text = "$$\nx$$\nCosts $5 and \\(y\\).";
    expect(preprocessMath(text)).toBe(
      escapeCurrencyDollars(
        normalizeMathDelimiters("$$\nx\n$$\nCosts $5 and \\(y\\)."),
      ),
    );
  });
});
