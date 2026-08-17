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

export function GenerativeUIStyle() {
  const css = [
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

  return <style>{css}</style>;
}
