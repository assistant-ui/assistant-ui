import { describe, it, expect } from "vitest";
import { shouldUseCodeAdapter } from "../adapters/code-adapter";

describe("shouldUseCodeAdapter", () => {
  it("returns false when no custom components provided", () => {
    expect(shouldUseCodeAdapter({})).toBe(false);
  });

  it("returns true when SyntaxHighlighter is provided", () => {
    const MockSyntaxHighlighter = () => null;
    expect(
      shouldUseCodeAdapter({ SyntaxHighlighter: MockSyntaxHighlighter }),
    ).toBe(true);
  });

  it("returns true when CodeHeader is provided", () => {
    const MockCodeHeader = () => null;
    expect(shouldUseCodeAdapter({ CodeHeader: MockCodeHeader })).toBe(true);
  });

  it("returns true when componentsByLanguage has entries", () => {
    expect(
      shouldUseCodeAdapter({
        componentsByLanguage: {
          mermaid: { SyntaxHighlighter: () => null },
        },
      }),
    ).toBe(true);
  });

  it("returns false when componentsByLanguage is empty", () => {
    expect(shouldUseCodeAdapter({ componentsByLanguage: {} })).toBe(false);
  });

  it("returns true when multiple options are provided", () => {
    expect(
      shouldUseCodeAdapter({
        SyntaxHighlighter: () => null,
        CodeHeader: () => null,
        componentsByLanguage: {
          python: { SyntaxHighlighter: () => null },
        },
      }),
    ).toBe(true);
  });
});
