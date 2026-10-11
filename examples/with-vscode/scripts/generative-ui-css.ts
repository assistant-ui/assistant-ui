import {
  generativeUiCssText,
  generativeUiElementsThemeCssText,
  generativeUiElementsThemeVars,
  generativeUiThemeVars,
} from "@assistant-ui/ui/lib/generative-ui-vocabulary-css.ts";

/** The vocabulary CSS keys its dark values off `.dark`; VS Code marks dark themes on the body instead. */
const DARK =
  ":is(.vscode-dark, .vscode-high-contrast:not(.vscode-high-contrast-light))";

const block = (selector: string, vars: Record<string, string>) =>
  `${selector} {\n${Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n")}\n}`;

/**
 * The rules and theme variables of the registry's `generative-ui-style` item,
 * which `shadcn add` writes into an app's CSS, with the elements theme layered
 * after them.
 */
export const generativeUiCss = () =>
  [
    block(":root", generativeUiThemeVars.light),
    block(DARK, generativeUiThemeVars.dark),
    block('[data-aui-theme="elements"]', generativeUiElementsThemeVars.light),
    block(
      `${DARK} [data-aui-theme="elements"]`,
      generativeUiElementsThemeVars.dark,
    ),
    generativeUiCssText(),
    generativeUiElementsThemeCssText(),
  ]
    .join("\n\n")
    .replace(/\.dark(?=[\s,{)])/g, DARK);
