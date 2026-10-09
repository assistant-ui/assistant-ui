import { getLLMText, type LLMRenderContext } from "@/lib/get-llm-text";
import { source } from "@/lib/source";
import { notFound } from "next/navigation";

export async function getDocsMarkdown(
  slug: string[] | undefined,
  options: LLMRenderContext,
) {
  const page = source.getPage(slug);
  if (!page) notFound();

  return getLLMText(page, options);
}
