import { buildCsp, type CspOptions } from "./csp";
import type { Compat, HostContext } from "./protocol";
import { runtimeSource } from "./runtime/generated";
import {
  DEFAULT_LIGHT_TOKENS,
  themeVariables,
  type ThemeTokens,
} from "./theme";

const escapeAttribute = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const escapeScript = (value: string) =>
  value.replace(/<\/(script)/gi, "<\\/$1");

const escapeStyle = (value: string) => value.replace(/<\/(style)/gi, "<\\/$1");

const SAFE_VARIABLE = /^--[\w-]+$/;
const SAFE_VALUE = /^[^;{}<>]*$/;

const rootDeclarations = (variables: Record<string, string>) =>
  Object.entries(variables)
    .filter(
      ([name, value]) => SAFE_VARIABLE.test(name) && SAFE_VALUE.test(value),
    )
    .map(([name, value]) => `${name}:${value};`)
    .join("");

/**
 * Base styles: transparent page, host typography, and themed form controls,
 * so plain markup already matches the host before any widget CSS loads.
 */
const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent}
html{overflow-y:hidden}
body{font-family:var(--font-sans);font-size:16px;line-height:1.5;color:var(--color-text);-webkit-font-smoothing:antialiased;overflow-wrap:anywhere}
#gf-root{display:flow-root;width:100%}
#gf-root[data-kind=svg]>svg{display:block;width:100%;height:auto}
h1,h2,h3,h4{line-height:1.25;margin:0 0 .5em;font-weight:600}
h1{font-size:22px}h2{font-size:18px}h3{font-size:16px}h4{font-size:14px}
p{margin:0 0 .75em}
a{color:var(--color-accent)}
code,kbd,pre,samp{font-family:var(--font-mono);font-size:.9em}
small{color:var(--color-text-muted)}
table{border-collapse:collapse;width:100%;font-size:14px;font-variant-numeric:tabular-nums}
th{font-weight:500;color:var(--color-text-muted);text-align:left}
th,td{padding:6px 10px;border-bottom:1px solid var(--color-border)}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;padding:6px 14px;border-radius:var(--radius-md);border:1px solid var(--color-border-strong);background:var(--color-surface);transition:background-color .15s,border-color .15s}
button:hover{background:var(--color-surface-muted)}
button:active{transform:translateY(1px)}
button:disabled{opacity:.5;cursor:not-allowed}
input:not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea{padding:6px 10px;border-radius:var(--radius-sm);border:1px solid var(--color-border-strong);background:var(--color-surface)}
input[type=checkbox],input[type=radio],input[type=range],progress,meter{accent-color:var(--color-accent)}
:focus-visible{outline:2px solid var(--color-accent);outline-offset:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`.trim();

export type BootstrapOptions = {
  /** The embedding page's origin; the frame only talks to this origin. */
  hostOrigin: string;
  csp?: CspOptions | string;
  tokens?: ThemeTokens;
  compat?: readonly Compat[];
  /** Fade in elements as they stream in. Always off under reduced motion. */
  animate?: boolean;
  /** Extra CSS appended after the base styles. */
  css?: string;
  /** Overrides the bundled runtime, mainly for tests. */
  runtime?: string;
};

/**
 * The document every widget frame loads once. It carries the CSP, the theme,
 * and the runtime; widget code arrives later over the private port.
 */
export function buildBootstrapHtml(options: BootstrapOptions): string {
  const tokens = options.tokens ?? DEFAULT_LIGHT_TOKENS;
  const csp =
    typeof options.csp === "string" ? options.csp : buildCsp(options.csp);
  const config = JSON.stringify({
    hostOrigin: options.hostOrigin,
    compat: [...(options.compat ?? [])],
    animate: options.animate ?? true,
  }).replace(/</g, "\\u003c");

  return [
    "<!doctype html>",
    `<html lang="en" data-theme="${tokens.colorScheme}" style="color-scheme:${tokens.colorScheme};background:transparent">`,
    "<head>",
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(csp)}">`,
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<style id="gf-base">:root{${rootDeclarations(themeVariables(tokens))}}\n${BASE_CSS}${
      options.css ? `\n${escapeStyle(options.css)}` : ""
    }</style>`,
    "</head>",
    '<body><div id="gf-root"></div>',
    `<script id="gf-config" type="application/json">${config}</script>`,
    `<script>${escapeScript(options.runtime ?? runtimeSource)}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

/** Host context sent with init and on every theme change. */
export function themeContext(tokens: ThemeTokens): HostContext {
  return {
    theme: tokens.colorScheme,
    styles: { variables: themeVariables(tokens) },
  };
}
