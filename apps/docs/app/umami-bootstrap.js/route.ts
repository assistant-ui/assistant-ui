import { umamiBootstrapScript } from "@/lib/umami-sampling";

export const dynamic = "force-static";

export function GET() {
  return new Response(umamiBootstrapScript, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
