export type WebviewCspSource = {
  readonly cspSource: string;
};

export type WebviewResourceLike<U> = WebviewCspSource & {
  asWebviewUri(uri: U): { toString(): string };
};

export type WebviewCspMode = "strict" | "relaxed";

export type WebviewCspOptions = {
  nonce: string;
  /**
   * `"relaxed"` swaps the style nonce for `'unsafe-inline'`, for libraries
   * that inject `<style>` tags without a nonce.
   */
  csp?: WebviewCspMode;
  /** Extra `script-src` sources, such as `webview.cspSource` for code-split chunks. */
  scriptSrc?: readonly string[];
  connectSrc?: readonly string[];
  frameSrc?: readonly string[];
  /** Adds `'wasm-unsafe-eval'` to `script-src` for WebAssembly modules. */
  wasmUnsafeEval?: boolean;
};

export type WebviewSurface = "sidebar" | "editor" | "panel";

export type RenderWebviewHtmlOptions<U> = Omit<WebviewCspOptions, "nonce"> & {
  scripts: readonly U[];
  styles?: readonly U[];
  title?: string;
  lang?: string;
  /** Defaults to a fresh random nonce per render. */
  nonce?: string;
  /** Sets `data-aui-vscode-surface` for `@assistant-ui/vscode/theme.css`. */
  surface?: WebviewSurface;
  /** Id of the empty mount element; `null` omits it. */
  rootId?: string | null;
  /** `"module"` (default) or `"classic"` deferred scripts. */
  scriptType?: "module" | "classic";
  htmlAttributes?: Readonly<Record<string, string>>;
  bodyAttributes?: Readonly<Record<string, string>>;
};

const NONCE_PATTERN = /^[A-Za-z0-9+/_-]+={0,2}$/;
const ATTRIBUTE_NAME_PATTERN = /^[A-Za-z_:][-A-Za-z0-9_:.]*$/;
const INVALID_SOURCE_PATTERN = /[\s;,'"]/;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);

const assertNonce = (nonce: string) => {
  if (!NONCE_PATTERN.test(nonce)) {
    throw new Error(`Invalid CSP nonce: ${JSON.stringify(nonce)}`);
  }
};

const sources = (directive: string, values: readonly string[]) => {
  for (const value of values) {
    if (value === "" || INVALID_SOURCE_PATTERN.test(value)) {
      throw new Error(
        `Invalid ${directive} source: ${JSON.stringify(value)}. Pass one host or scheme source per entry.`,
      );
    }
  }
  return values;
};

const attributes = (values: Readonly<Record<string, string>>) =>
  Object.entries(values)
    .map(([name, value]) => {
      if (!ATTRIBUTE_NAME_PATTERN.test(name)) {
        throw new Error(`Invalid attribute name: ${JSON.stringify(name)}`);
      }
      return ` ${name}="${escapeHtml(value)}"`;
    })
    .join("");

/** Returns a base64 nonce from 16 cryptographically random bytes. */
export function createCspNonce(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error(
      "createCspNonce() needs globalThis.crypto.getRandomValues (Node.js 19 or later).",
    );
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Returns the Content-Security-Policy for a webview whose scripts carry
 * `nonce` and whose other resources load through `asWebviewUri`.
 */
export function createWebviewCsp(
  webview: WebviewCspSource,
  options: WebviewCspOptions,
): string {
  const { nonce, csp = "strict" } = options;
  assertNonce(nonce);
  const { cspSource } = webview;
  sources("cspSource", [cspSource]);
  const frameSrc = sources("frame-src", options.frameSrc ?? []);

  const directives: [string, ...string[]][] = [
    ["default-src", "'none'"],
    [
      "script-src",
      `'nonce-${nonce}'`,
      ...sources("script-src", options.scriptSrc ?? []),
      ...(options.wasmUnsafeEval ? ["'wasm-unsafe-eval'"] : []),
    ],
    [
      "style-src",
      cspSource,
      csp === "relaxed" ? "'unsafe-inline'" : `'nonce-${nonce}'`,
    ],
    ["img-src", cspSource, "blob:", "data:", "https:"],
    ["font-src", cspSource, "data:"],
    [
      "connect-src",
      cspSource,
      ...sources("connect-src", options.connectSrc ?? []),
    ],
    ["frame-src", ...(frameSrc.length > 0 ? frameSrc : ["'none'"])],
  ];

  return directives.map((directive) => directive.join(" ")).join("; ");
}

/**
 * Renders the HTML document for a webview: a CSP meta tag, the nonce in
 * `<meta property="csp-nonce">` for `getCspNonce()`, the stylesheets, a mount
 * element, and the scripts, each carrying the nonce.
 */
export function renderWebviewHtml<U>(
  webview: WebviewResourceLike<U>,
  options: RenderWebviewHtmlOptions<U>,
): string {
  const {
    scripts,
    styles = [],
    title = "",
    lang = "en",
    nonce = createCspNonce(),
    surface,
    rootId = "root",
    scriptType = "module",
    htmlAttributes = {},
    bodyAttributes = {},
    ...cspOptions
  } = options;

  const csp = createWebviewCsp(webview, { ...cspOptions, nonce });
  const url = (uri: U) => escapeHtml(webview.asWebviewUri(uri).toString());
  const scriptAttributes =
    scriptType === "module" ? ' type="module"' : " defer";

  return [
    "<!doctype html>",
    `<html${attributes({ lang, ...htmlAttributes })}>`,
    "<head>",
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta property="csp-nonce" nonce="${nonce}">`,
    `<title>${escapeHtml(title)}</title>`,
    ...styles.map((uri) => `<link rel="stylesheet" href="${url(uri)}">`),
    "</head>",
    `<body${attributes({
      ...(surface ? { "data-aui-vscode-surface": surface } : {}),
      ...bodyAttributes,
    })}>`,
    ...(rootId === null ? [] : [`<div id="${escapeHtml(rootId)}"></div>`]),
    ...scripts.map(
      (uri) =>
        `<script${scriptAttributes} nonce="${nonce}" src="${url(uri)}"></script>`,
    ),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
