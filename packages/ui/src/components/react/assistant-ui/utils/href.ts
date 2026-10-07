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
