import { describe, expect, it } from "vitest";
import { compareComponentsByLanguage, parseLanguageClass } from "./code-fence";

describe("parseLanguageClass", () => {
  it("extracts the language id from a language- class", () => {
    expect(parseLanguageClass("language-tsx")).toBe("tsx");
  });

  it("keeps punctuation-bearing language ids intact", () => {
    expect(parseLanguageClass("language-c++")).toBe("c++");
    expect(parseLanguageClass("language-objective-c")).toBe("objective-c");
  });

  it("extracts the id when unrelated classes surround the token", () => {
    expect(parseLanguageClass("hljs language-python line-numbers")).toBe(
      "python",
    );
  });

  it("stops the id at whitespace", () => {
    expect(parseLanguageClass("language-ts extra")).toBe("ts");
  });

  it("returns an empty string for a missing or unrelated class", () => {
    expect(parseLanguageClass(undefined)).toBe("");
    expect(parseLanguageClass("")).toBe("");
    expect(parseLanguageClass("hljs line-numbers")).toBe("");
  });
});

describe("compareComponentsByLanguage", () => {
  const Highlighter = () => null;

  it("treats structurally equal fresh objects as equal", () => {
    expect(
      compareComponentsByLanguage(
        { mermaid: { SyntaxHighlighter: Highlighter } },
        { mermaid: { SyntaxHighlighter: Highlighter } },
      ),
    ).toBe(true);
  });

  it("detects changed and added languages", () => {
    const Other = () => null;
    const OtherHeader = () => null;
    expect(
      compareComponentsByLanguage(
        { mermaid: { SyntaxHighlighter: Highlighter } },
        { mermaid: { SyntaxHighlighter: Other } },
      ),
    ).toBe(false);
    expect(
      compareComponentsByLanguage(
        { mermaid: { CodeHeader: Highlighter } },
        { mermaid: { CodeHeader: OtherHeader } },
      ),
    ).toBe(false);
    expect(
      compareComponentsByLanguage(
        { mermaid: { SyntaxHighlighter: Highlighter } },
        {
          mermaid: { SyntaxHighlighter: Highlighter },
          python: { SyntaxHighlighter: Other },
        },
      ),
    ).toBe(false);
  });

  it("distinguishes same-sized maps with different keys and undefined entries", () => {
    expect(
      compareComponentsByLanguage(
        { a: undefined },
        { b: { SyntaxHighlighter: Highlighter } },
      ),
    ).toBe(false);
    expect(
      compareComponentsByLanguage(
        { mermaid: undefined },
        { mermaid: { SyntaxHighlighter: Highlighter } },
      ),
    ).toBe(false);
    expect(
      compareComponentsByLanguage({ a: undefined }, { a: undefined }),
    ).toBe(true);
  });

  it("does not read inherited keys off the next map", () => {
    expect(
      compareComponentsByLanguage(
        { toString: { SyntaxHighlighter: Highlighter } },
        { other: { SyntaxHighlighter: Highlighter } },
      ),
    ).toBe(false);
  });

  it("handles absent maps by identity", () => {
    expect(compareComponentsByLanguage(undefined, undefined)).toBe(true);
    expect(
      compareComponentsByLanguage(undefined, {
        mermaid: { SyntaxHighlighter: Highlighter },
      }),
    ).toBe(false);
  });
});
