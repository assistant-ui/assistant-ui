import { describe, it, expect } from "vitest";
import {
  auiCardSurfaceSelectors,
  generativeUiElementsThemeCss,
  generativeUiVocabularyCss,
  generativeUiCssText,
} from "./generative-ui-vocabulary-css";

const rules = generativeUiVocabularyCss as Record<
  string,
  Record<string, string>
>;
const themedRules = generativeUiElementsThemeCss as Record<
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

  it("keeps badges content-sized inside column layouts", () => {
    expect(rules['[data-aui="badge"]']!["align-self"]).toBe("flex-start");
  });

  it("leaves explicitly aligned rows and columns in control of badges", () => {
    expect(
      rules[
        '[data-aui="row"][data-aui-align="start"] > [data-aui="badge"], [data-aui="col"][data-aui-align="start"] > [data-aui="badge"]'
      ]!["align-self"],
    ).toBe("flex-start");
    expect(
      rules[
        '[data-aui="row"][data-aui-align="center"] > [data-aui="badge"], [data-aui="col"][data-aui-align="center"] > [data-aui="badge"]'
      ]!["align-self"],
    ).toBe("center");
    expect(
      rules[
        '[data-aui="row"][data-aui-align="end"] > [data-aui="badge"], [data-aui="col"][data-aui-align="end"] > [data-aui="badge"]'
      ]!["align-self"],
    ).toBe("flex-end");
  });

  it("places compact carousel controls after the slides", () => {
    const controls = '[data-aui="carousel-controls"]';
    const buttons = '[data-aui="carousel-prev"], [data-aui="carousel-next"]';
    const keys = Object.keys(generativeUiVocabularyCss);
    expect(keys.indexOf(controls)).toBe(
      keys.indexOf('[data-aui="carousel-slide"]') + 1,
    );
    expect(rules[controls]).toMatchObject({
      display: "flex",
      "justify-content": "flex-end",
      gap: "0.25rem",
      margin: "0.5rem 0 0",
    });
    expect(rules[buttons]).toMatchObject({
      width: "2rem",
      height: "2rem",
      "background-color": "transparent",
    });
    expect(
      rules[
        '[data-aui="carousel-prev"]:focus-visible, [data-aui="carousel-next"]:focus-visible'
      ],
    ).toMatchObject({
      outline: "2px solid var(--ring)",
      "outline-offset": "2px",
    });
    expect(
      themedRules[
        '[data-aui-theme="elements"] [data-aui="button"][data-aui-style="ghost"], [data-aui-theme="elements"] [data-aui="card-cancel"], [data-aui-theme="elements"] [data-aui="carousel-prev"], [data-aui-theme="elements"] [data-aui="carousel-next"]'
      ],
    ).toMatchObject({ "background-color": "transparent" });
  });
});

describe("chart colors", () => {
  it("keeps legend labels muted while their swatches read the series color", () => {
    expect(rules['[data-aui="chart-legend-swatch"]']!["background-color"]).toBe(
      "var(--aui-series-color, currentColor)",
    );
    expect(
      rules['[data-aui="chart-legend-item"][data-aui-color="white"]']![
        "--aui-series-color"
      ],
    ).toBe("white");
    expect(
      rules['[data-aui="chart-series"][data-aui-color="white"]']!["color"],
    ).toBe("white");
    expect(
      themedRules[
        '[data-aui-theme="elements"] [data-aui="chart-series"][data-aui-color="white"]'
      ]!["color"],
    ).toBe("white");
  });
});
