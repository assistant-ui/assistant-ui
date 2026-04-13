/**
 * Sanitize a URL to ensure it's safe for use in href attributes.
 * Only allows http: and https: protocols.
 *
 * @returns The sanitized URL string, or undefined if invalid/unsafe
 */
export function sanitizeHref(href?: string): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}
