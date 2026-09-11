import { sha256 } from "./sha256";

const CACHE_CONTROL = "no-cache, must-revalidate";

export function createMarkdownResponse(
  content: string,
  contentType = "text/markdown; charset=utf-8",
) {
  const digest = sha256(content);

  return new Response(content, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": contentType,
      ETag: `"sha256-${digest}"`,
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
