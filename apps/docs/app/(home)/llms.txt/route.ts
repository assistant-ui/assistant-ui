import { cacheLife } from "next/cache";
import { design, elementsDocs, examples, source } from "@/lib/source";
import { buildLLMSIndex } from "@/lib/llms-index";

async function getIndex() {
  "use cache";
  cacheLife("max");
  return buildLLMSIndex(
    source.getPages(),
    examples.getPages(),
    design.getPages(),
    elementsDocs.getPages(),
  );
}

export async function GET() {
  return new Response(await getIndex(), {
    headers: {
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
