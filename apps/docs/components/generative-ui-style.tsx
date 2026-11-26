import { createHash } from "node:crypto";
import {
  generativeUiCssText,
  generativeUiElementsThemeCssText,
  generativeUiElementsThemeVars,
  generativeUiThemeVars,
} from "@assistant-ui/ui/lib/generative-ui-vocabulary-css";

function themeVarsBlock(selector: string, vars: Record<string, string>) {
  const body = Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

export const generativeUiStylesheet = [
  themeVarsBlock(":root", generativeUiThemeVars.light),
  themeVarsBlock(".dark", generativeUiThemeVars.dark),
  themeVarsBlock(
    '[data-aui-theme="elements"]',
    generativeUiElementsThemeVars.light,
  ),
  themeVarsBlock(
    '.dark [data-aui-theme="elements"]',
    generativeUiElementsThemeVars.dark,
  ),
  generativeUiCssText(),
  generativeUiElementsThemeCssText(),
].join("\n\n");

// The version in the url changes with the stylesheet, so browsers keep one
// copy across every page and deploy until it changes.
export const GENERATIVE_UI_STYLESHEET_HREF = `/generative-ui.css?v=${createHash(
  "sha256",
)
  .update(generativeUiStylesheet)
  .digest("hex")
  .slice(0, 12)}`;

// The stylesheet is about 48 KB. Inlined, every page carried it twice: once
// in a <style> tag and once more in the page's flight data. As a linked file
// each page carries one tag, and it still loads after the app stylesheets so
// it keeps its place in the cascade.
export function GenerativeUIStyle() {
  return <link rel="stylesheet" href={GENERATIVE_UI_STYLESHEET_HREF} />;
}
