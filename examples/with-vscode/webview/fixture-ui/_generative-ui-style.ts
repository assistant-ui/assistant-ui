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

const css = [
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

let installed = false;

/**
 * Adds the generative-ui vocabulary CSS, which the shadcn registry ships as a
 * `registry:style` item, as a constructed stylesheet: the strict CSP blocks an
 * inline `<style>`, and the test bed's `app.css` does not carry it.
 */
export function installGenerativeUIStyle() {
  if (installed) return;
  installed = true;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}
