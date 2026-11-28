import { generativeUiStylesheet } from "@/lib/generative-ui-stylesheet";

export function GET() {
  return new Response(generativeUiStylesheet(), {
    headers: { "Content-Type": "text/css; charset=utf-8" },
  });
}
