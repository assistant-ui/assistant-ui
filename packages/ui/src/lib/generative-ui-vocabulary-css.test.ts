import { describe, it, expect } from "vitest";
import {
  auiCardSurfaceSelectors,
  generativeUiVocabularyCss,
  generativeUiCssText,
} from "./generative-ui-vocabulary-css";

const rules = generativeUiVocabularyCss as Record<
  string,
  Record<string, string>
>;

describe("card surface", () => {
  it("is selected by an attribute rather than :has(), which the browserslist floor lacks", () => {
    for (const selector of auiCardSurfaceSelectors) {
      expect(selector).not.toContain(":has(");
    }
    expect(generativeUiCssText()).not.toContain(":has(");
  });

  it("leaves padding to the tokens, which are one attribute and would otherwise lose", () => {
    const surface = rules[auiCardSurfaceSelectors.join(", ")];
    expect(surface).toBeDefined();
    // A surface names two attributes, so declaring `padding` here would outrank
    // every `[data-aui-padding="N"]` token and make Card.padding inert.
    expect(surface!["padding"]).toBeUndefined();
    expect(surface!["--aui-card-padding"]).toBe("1.25rem");
    expect(rules['[data-aui="card"]']!["padding"]).toBe(
      "var(--aui-card-padding, 0)",
    );
  });

  it("declares the padding tokens after the card rules so they win on source order", () => {
    const keys = Object.keys(generativeUiVocabularyCss);
    expect(keys.indexOf('[data-aui-padding="2"]')).toBeGreaterThan(
      keys.indexOf(auiCardSurfaceSelectors.join(", ")),
    );
  });
});

describe("generative UI surface", () => {
  it("hides itself while it has no children so its margins do not hold a gap open", () => {
    expect(rules['[data-aui="root"]:empty']!["display"]).toBe("none");
  });
});
