import { generativeUiStylesheet } from "@/components/generative-ui-style";

// Prerendered at build time. The root layout links it with a content hash in
// the url, so a year-long immutable cache is safe.
export function GET() {
  return new Response(generativeUiStylesheet, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
