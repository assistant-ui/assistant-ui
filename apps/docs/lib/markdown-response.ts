import { sha256 } from "./sha256";

const CACHE_CONTROL = "no-cache, must-revalidate";

export function createMarkdownResponse(
  content: string | null,
  contentType = "text/markdown; charset=utf-8",
) {
  const body =
    content ??
    "# Page not found\n\nBrowse the [documentation index](/llms.txt) or return to the [homepage](/index.md).\n";
  const digest = sha256(body);

  return new Response(body, {
    status: content === null ? 404 : 200,
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": contentType,
      ETag: `"sha256-${digest}"`,
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
