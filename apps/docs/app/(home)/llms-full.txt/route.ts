import { examples, source } from "@/lib/source";
import { getLLMText } from "@/lib/get-llm-text";

export const revalidate = false;

export async function GET() {
  const scan = [...source.getPages(), ...examples.getPages()].map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"), {
    headers: {
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
