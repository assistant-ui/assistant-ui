import { describe, expect, it } from "vitest";
import { parseLanguageClass } from "./code-fence";

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
