import { examples, source } from "@/lib/source";
import { buildLLMSIndex } from "@/lib/llms-index";

export const revalidate = false;

export async function GET() {
  return new Response(buildLLMSIndex(source.getPages(), examples.getPages()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
