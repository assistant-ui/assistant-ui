/** Script, style, image, and font hosts widgets may load from by default. */
export const DEFAULT_CDN_ORIGINS: readonly string[] = [
  "https://cdnjs.cloudflare.com",
  "https://cdn.jsdelivr.net",
  "https://unpkg.com",
  "https://esm.sh",
];

/** Google Fonts stylesheet origins for an explicit `fontStyleOrigins` opt-in. */
export const DEFAULT_FONT_STYLE_ORIGINS: readonly string[] = [
  "https://fonts.googleapis.com",
];

/** Google Fonts file origins for an explicit `fontOrigins` opt-in. */
export const DEFAULT_FONT_ORIGINS: readonly string[] = [
  "https://fonts.gstatic.com",
];

export type CspOptions = {
  /** Origins for scripts, styles, images, fonts, and media. Defaults to `DEFAULT_CDN_ORIGINS`. */
  cdnOrigins?: readonly string[];
  /** Extra origins for font stylesheets, allowed only in `style-src`. Empty by default. */
  fontStyleOrigins?: readonly string[];
  /** Extra origins for font files, allowed only in `font-src`. Empty by default. */
  fontOrigins?: readonly string[];
  /** Origins `fetch`, XHR, and WebSocket may reach. Empty (the default) blocks all network access. */
  connectOrigins?: readonly string[];
  /** Extra image origins, such as an image proxy. */
  imageOrigins?: readonly string[];
  /** Origins that may be embedded in nested frames. Empty by default. */
  frameOrigins?: readonly string[];
  /** Allows `eval` and `new Function`, which some charting libraries need. Off by default. */
  allowEval?: boolean;
};

const KEYWORDS = new Set(["'self'", "'none'", "data:", "blob:", "https:"]);

const isSafeSource = (value: string, allowWebSocket: boolean): boolean => {
  if (KEYWORDS.has(value)) return true;
  const scheme = allowWebSocket ? /^(?:https?|wss?):\/\//i : /^https?:\/\//i;
  if (!scheme.test(value) || /[\s;'"`,]/.test(value)) return false;
  try {
    const url = new URL(value.replace("://*.", "://wildcard."));
    return (
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
};

const sources = (
  values: readonly string[] | undefined,
  allowWebSocket = false,
) => [
  ...new Set(
    (values ?? []).filter(
      (value) =>
        typeof value === "string" && isSafeSource(value, allowWebSocket),
    ),
  ),
];

/** Builds the Content-Security-Policy every widget frame enforces. */
export function buildCsp(options: CspOptions = {}): string {
  const cdn = sources(options.cdnOrigins ?? DEFAULT_CDN_ORIGINS);
  const connect = sources(options.connectOrigins, true);
  const frames = sources(options.frameOrigins);
  const images = sources(options.imageOrigins);
  const fontStyles = sources(options.fontStyleOrigins);
  const fonts = sources(options.fontOrigins);
  const directive = (name: string, values: readonly string[]) =>
    `${name} ${values.length > 0 ? values.join(" ") : "'none'"}`;

  return [
    "default-src 'none'",
    directive("script-src", [
      "'unsafe-inline'",
      ...(options.allowEval ? ["'unsafe-eval'"] : []),
      ...cdn,
    ]),
    directive("style-src", ["'unsafe-inline'", ...cdn, ...fontStyles]),
    directive("img-src", ["data:", "blob:", ...cdn, ...images]),
    directive("font-src", ["data:", ...cdn, ...fonts]),
    directive("media-src", ["data:", "blob:", ...cdn]),
    directive("connect-src", connect),
    directive("frame-src", frames),
    "worker-src blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}
