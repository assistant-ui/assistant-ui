/**
 * URL and origin checks for policy decisions. They compare parsed http(s)
 * URLs, never `URL.origin` strings: every opaque origin (`about:srcdoc`,
 * `javascript:`, `data:`, `blob:` of an opaque document …) serializes to
 * "null", so two unrelated opaque origins would compare equal.
 */

/** Parses `url` (against `base`) when it is an http(s) URL; null otherwise. */
export function parseHttpUrl(url: string, base?: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(url, base);
  } catch {
    return null;
  }
  return parsed.protocol === "https:" || parsed.protocol === "http:"
    ? parsed
    : null;
}

/**
 * True when both are http(s) URLs with the same scheme, host and port.
 * Anything else has an opaque origin, which matches nothing, not even itself.
 */
export function isSameOrigin(a: string, b: string): boolean {
  const ua = parseHttpUrl(a);
  const ub = parseHttpUrl(b);
  return (
    ua !== null &&
    ub !== null &&
    ua.protocol === ub.protocol &&
    ua.hostname === ub.hostname &&
    ua.port === ub.port
  );
}

export type OverlayOrigins = "same-origin" | "any" | readonly string[];

/**
 * Checks an overlay's `src`. Overlay content must be an http(s) URL, and:
 * - "same-origin": same origin as the requesting remote's URL (an inline
 *   `html` remote has an opaque origin, so nothing matches);
 * - "any": any http(s) URL;
 * - a list: same origin as one of the listed http(s) origins.
 * Returns the reason when refused.
 */
export function checkOverlaySrc(
  src: string,
  remoteSrc: string,
  allowed: OverlayOrigins,
): { ok: true } | { ok: false; reason: string } {
  const url = parseHttpUrl(src);
  if (url === null)
    return { ok: false, reason: "Overlay src must be an absolute http(s) URL" };
  const ok =
    allowed === "any" ||
    (allowed === "same-origin"
      ? isSameOrigin(url.href, remoteSrc)
      : allowed.some((origin) => isSameOrigin(url.href, origin)));
  return ok
    ? { ok: true }
    : {
        ok: false,
        reason: `Overlay content from ${url.origin} is not allowed by this host`,
      };
}
