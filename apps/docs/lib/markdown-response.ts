export const MARKDOWN_CACHE_CONTROL =
  "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400";

export const MARKDOWN_RESPONSE_HEADERS = {
  "Cache-Control": MARKDOWN_CACHE_CONTROL,
  "Content-Type": "text/markdown; charset=utf-8",
  "X-Robots-Tag": "noindex, follow",
} as const;

export const PLAIN_TEXT_RESPONSE_HEADERS = {
  ...MARKDOWN_RESPONSE_HEADERS,
  "Content-Type": "text/plain; charset=utf-8",
} as const;
