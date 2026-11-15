/**
 * Link targets the elements take from a model or a tool.
 *
 * React 19 refuses a `javascript:` href but React 18 only warns, and neither
 * blocks `data:` or `vbscript:`, so an element passes a caller's URL through
 * here before it becomes an `href` or a navigation target.
 */

const RELATIVE = /^(?:[/?#]|\.{1,2}\/)/;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

const parse = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

/**
 * `url` when a browser following it runs no script: an `http:`, `https:`, or
 * `mailto:` URL, or one relative to the page. Anything else, including a
 * string that is not a URL at all, is `undefined`.
 */
export function safeHref(url: string | undefined): string | undefined {
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (trimmed === "") return undefined;
  const parsed = parse(trimmed);
  if (parsed) {
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? trimmed : undefined;
  }
  return RELATIVE.test(trimmed) ? trimmed : undefined;
}

/** The host `url` points at, without a leading `www.`, or `undefined`. */
export function hostOf(url: string | undefined): string | undefined {
  const href = safeHref(url);
  const hostname = href === undefined ? "" : (parse(href)?.hostname ?? "");
  return hostname.replace(/^www\./, "") || undefined;
}

/**
 * Resources an element fetches as soon as it renders: images, posters,
 * media metadata, CSS backgrounds.
 *
 * When the URL comes from a model or a tool, fetching it on render tells that
 * host the chat was viewed. The elements fetch local URLs right away, and a
 * remote URL only when its origin is in the caller's `origins` list. Pass
 * `["*"]` to allow every `http:` and `https:` origin.
 */

const LOCAL_SCHEME = /^(?:data:image\/|data:audio\/|data:video\/|blob:)/i;

/**
 * Whether `url` may be fetched without a user action: a URL relative to the
 * page, a `data:` image, audio or video, a `blob:` URL, or an `http:` or
 * `https:` URL whose origin is listed in `origins`.
 */
export function canPreload(
  url: string | undefined,
  origins: readonly string[] | undefined,
): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed === "") return false;
  if (LOCAL_SCHEME.test(trimmed)) return true;
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return false;
    }
    return isListed(parsed, origins);
  }
  // Resolve the way a browser does, so `//host`, `/\host` and URLs with
  // tabs or newlines inside count as the other host they reach. `https:host`
  // stays on the page under an `https:` page but reaches `host` under an
  // `http:` one, so the URL must stay local or be listed under both.
  return ["http:", "https:"].every((scheme) => {
    const base = `${scheme}//relative.invalid`;
    try {
      const resolved = new URL(trimmed, `${base}/`);
      return resolved.origin === base || isListed(resolved, origins);
    } catch {
      return false;
    }
  });
}

function isListed(url: URL, origins: readonly string[] | undefined): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return (origins ?? []).some((entry) => {
    if (entry === "*") return true;
    try {
      return new URL(entry).origin === url.origin;
    } catch {
      return false;
    }
  });
}

const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^"'()\s]*))\s*\)/gi;

/** CSS that can load or substitute an image without a plain `url(...)`. */
const INDIRECT_CSS = /\\|image-set\(|\b(?:var|env|attr|src)\(/i;

/**
 * `value` when every `url(...)` in this CSS `background-image` value passes
 * `canPreload`, otherwise `undefined`. Escapes, `image-set()`, `var()`,
 * `env()`, `attr()` and `src()` are refused, since they can name a URL
 * without a plain `url(...)`.
 */
export function safeBackgroundImage(
  value: string | undefined,
  origins: readonly string[] | undefined,
): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  if (INDIRECT_CSS.test(value)) return undefined;
  let allowed = true;
  const rest = value.replace(CSS_URL, (_, double, single, bare) => {
    if (!canPreload(double ?? single ?? bare ?? "", origins)) allowed = false;
    return "";
  });
  // CSS closes an unterminated `url(` or string at the end of the value, so
  // any `url(` or quote left unmatched could still name a URL.
  if (!allowed || /url\(|["']/i.test(rest)) return undefined;
  return value;
}
