import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  auiCardSurfaceSelectors,
  generativeUiElementsThemeCss,
  generativeUiVocabularyCss,
  generativeUiThemeVars,
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

type Oklab = readonly [number, number, number];
type Srgb = readonly [number, number, number];
type ThemeMode = "light" | "dark";

const defaultThemeCss = readFileSync(
  resolve(process.cwd(), "../../templates/minimal/app/globals.css"),
  "utf8",
);

const defaultThemeToken = (
  mode: ThemeMode,
  name: "background" | "foreground" | "destructive",
) => {
  const selector = mode === "light" ? ":root" : "\\.dark";
  const block = defaultThemeCss.match(
    new RegExp(`${selector}\\s*\\{([^}]+)\\}`),
  );
  if (!block) throw new Error(`Missing ${mode} theme block`);
  const token = block[1]!.match(new RegExp(`--${name}:\\s*(oklch\\([^;]+\\))`));
  if (!token) throw new Error(`Missing ${mode} theme token: ${name}`);
  return token[1]!;
};

const toOklab = (value: string): Oklab => {
  const match = value.match(/oklch\(([^)]+)\)/);
  if (!match) throw new Error(`Expected an oklch color: ${value}`);
  const [lightness, chroma, hue] = match[1]!.trim().split(/\s+/).map(Number);
  const radians = (hue! * Math.PI) / 180;
  return [lightness!, chroma! * Math.cos(radians), chroma! * Math.sin(radians)];
};

const toSrgb = ([lightness, a, b]: Oklab): Srgb => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const encode = (channel: number) => {
    const clamped = Math.max(0, Math.min(1, channel));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  };
  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const mixOklab = (
  [lightness, a, b]: Oklab,
  [foregroundLightness, foregroundA, foregroundB]: Oklab,
  colorShare: number,
): Oklab => [
  lightness * colorShare + foregroundLightness * (1 - colorShare),
  a * colorShare + foregroundA * (1 - colorShare),
  b * colorShare + foregroundB * (1 - colorShare),
];

const relativeLuminance = ([red, green, blue]: Srgb) => {
  const linearize = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
};

const contrastRatio = (first: Srgb, second: Srgb) => {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
};

const toneStyleCases = [
  {
    name: "good Fact delta",
    selector: '[data-aui="fact-delta"][data-aui-tone="good"]',
    token: "--aui-success",
  },
  {
    name: "bad Fact delta",
    selector: '[data-aui="fact-delta"][data-aui-tone="bad"]',
    token: "--destructive",
  },
  {
    name: "success badge",
    selector: '[data-aui="badge"][data-aui-variant="success"]',
    token: "--aui-success",
  },
  {
    name: "warning badge",
    selector: '[data-aui="badge"][data-aui-variant="warning"]',
    token: "--aui-warning",
  },
  {
    name: "danger badge",
    selector: '[data-aui="badge"][data-aui-variant="danger"]',
    token: "--destructive",
  },
] as const;

describe("tone text contrast", () => {
  it.each(toneStyleCases)(
    "keeps $name above 4.5:1 in both default themes",
    ({ selector, token }) => {
      const style = rules[selector]!;
      expect(style["background-color"]).toBe(
        `color-mix(in oklab, var(${token}) 15%, transparent)`,
      );
      expect(style.color).toBe(
        `color-mix(in oklab, var(${token}) 60%, var(--foreground))`,
      );

      for (const mode of ["light", "dark"] as const) {
        const tone =
          token === "--destructive"
            ? defaultThemeToken(mode, "destructive")
            : generativeUiThemeVars[mode][token];
        const foreground = defaultThemeToken(mode, "foreground");
        const background = defaultThemeToken(mode, "background");
        const textColor = toSrgb(
          mixOklab(toOklab(tone), toOklab(foreground), 0.6),
        );
        const toneRgb = toSrgb(toOklab(tone));
        const backgroundRgb = toSrgb(toOklab(background));
        const tintedBackground: Srgb = [
          toneRgb[0] * 0.15 + backgroundRgb[0] * 0.85,
          toneRgb[1] * 0.15 + backgroundRgb[1] * 0.85,
          toneRgb[2] * 0.15 + backgroundRgb[2] * 0.85,
        ];

        expect(
          contrastRatio(textColor, tintedBackground),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});

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
      "var(--aui-card-padding, 1rem 1.125rem)",
    );
  });

  it("declares the padding tokens after the card rules so they win on source order", () => {
    const keys = Object.keys(generativeUiVocabularyCss);
    expect(keys.indexOf('[data-aui-padding="2"]')).toBeGreaterThan(
      keys.indexOf(auiCardSurfaceSelectors.join(", ")),
    );
  });

  it("renders a plain card as a borderless panel filled from the theme", () => {
    const card = rules['[data-aui="card"]']!;
    expect(card["background-color"]).toBe(
      "var(--aui-panel, color-mix(in oklab, var(--foreground) 4%, transparent))",
    );
    expect(card["border"]).toBeUndefined();
    expect(generativeUiThemeVars.light["--aui-panel"]).toBe(
      "color-mix(in oklab, var(--foreground) 4%, transparent)",
    );
    expect(generativeUiThemeVars.dark["--aui-panel"]).toBe(
      "color-mix(in oklab, var(--foreground) 6%, transparent)",
    );
  });

  it("keeps a card inside a card plain, before the surface rule so a nested surface keeps its frame", () => {
    const nested = '[data-aui="card"] [data-aui="card"]';
    expect(rules[nested]).toEqual({
      "--aui-card-padding": "0",
      "border-radius": "0",
      "background-color": "transparent",
    });
    const keys = Object.keys(generativeUiVocabularyCss);
    expect(keys.indexOf(nested)).toBeLessThan(
      keys.indexOf(auiCardSurfaceSelectors.join(", ")),
    );
  });
});

describe("answer layout", () => {
  it("spaces a render_spec frame from the reply's text the way a present root is spaced", () => {
    expect(rules["[data-gf-spec]"]!["margin-block"]).toBe(
      rules['[data-aui="root"]']!["margin-block"],
    );
  });

  it("labels a fact in sentence case at the 12px floor", () => {
    const label = rules['[data-aui="fact-label"]']!;
    expect(label["text-transform"]).toBeUndefined();
    expect(label["letter-spacing"]).toBeUndefined();
    expect(label["font-size"]).toBe("0.75rem");
  });

  it("keeps facts in a card's row lighter than the card title", () => {
    const value =
      rules[
        '[data-aui="card"] [data-aui="row"] > [data-aui="fact"] > [data-aui="fact-value"]'
      ]!;
    const title = rules['[data-aui="card-title"]']!;
    expect(value["font-size"]).toBe(title["font-size"]);
    expect(Number(value["font-weight"])).toBeLessThan(
      Number(title["font-weight"]),
    );
  });

  it("lets row images shrink to fit while keeping a fifth of the row beside text", () => {
    const gallery =
      rules[
        '[data-aui="row"] > [data-aui="image"]:not([data-aui-size="sm"], [data-aui-sized], [data-aui-round])'
      ]!;
    expect(gallery["flex"]).toBe("1 1 0");
    expect(gallery["min-width"]).toBe("max(5rem, 22%)");
    expect(
      rules[
        '[data-aui="row"] > [data-aui="image"][data-aui-size="sm"]:not([data-aui-round])'
      ]!["flex"],
    ).toBe("none");
  });
});

describe("generative UI surface", () => {
  it("shows the list row focus ring on its native button", () => {
    expect(
      rules['[data-aui="listview-item-trigger"] > button:focus-visible'],
    ).toMatchObject({
      outline: "2px solid var(--ring)",
      "outline-offset": "2px",
      "border-radius": "inherit",
    });
    expect(
      rules['[data-aui="listview-item-trigger"]:focus-visible'],
    ).toBeUndefined();
  });

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
    const frame = '[data-aui="carousel-frame"]';
    const controls = '[data-aui="carousel-controls"]';
    const buttons = '[data-aui="carousel-prev"], [data-aui="carousel-next"]';
    const keys = Object.keys(generativeUiVocabularyCss);
    expect(rules[frame]).toMatchObject({ "min-width": "0" });
    expect(keys.indexOf(frame)).toBe(keys.indexOf('[data-aui="carousel"]') - 1);
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

describe("markdown tables", () => {
  it("leaves a GFM-aligned cell to its align attribute", () => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(generativeUiCssText());
    document.body.innerHTML =
      '<div data-aui="markdown"><table><tbody><tr><td align="center"></td><td></td></tr></tbody></table></div>';
    const [aligned, plain] = document.querySelectorAll("td");
    const textAlign = (cell: Element | undefined) =>
      [...sheet.cssRules]
        .filter(
          (rule): rule is CSSStyleRule =>
            rule instanceof CSSStyleRule &&
            rule.selectorText.includes('[data-aui="markdown"]') &&
            cell !== undefined &&
            cell.matches(rule.selectorText),
        )
        .map((rule) => rule.style.getPropertyValue("text-align"))
        .filter(Boolean);

    expect(textAlign(aligned)).toEqual([]);
    expect(textAlign(plain)).toEqual(["start"]);
    document.body.innerHTML = "";
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
