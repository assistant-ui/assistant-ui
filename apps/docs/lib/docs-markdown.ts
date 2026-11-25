import { getLLMText, type LLMRenderContext } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

export async function getDocsMarkdown(
  slug: string[] | undefined,
  options: LLMRenderContext,
) {
  const page = source.getPage(slug);
  if (!page) return null;

  return getLLMText(page, options);
}
