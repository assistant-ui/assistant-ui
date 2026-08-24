import { examples, source, standalone, getTapDocsPages } from "@/lib/source";
import { buildLLMSIndex } from "@/lib/llms-index";

export const revalidate = false;

export async function GET() {
  return new Response(
    buildLLMSIndex(
      source.getPages(),
      getTapDocsPages(),
      examples.getPages(),
      standalone.getPages(),
    ),
    {
      headers: {
        "Cache-Control": "no-cache, must-revalidate",
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
