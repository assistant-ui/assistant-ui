import { getLLMText, type LLMRenderContext } from "@/lib/get-llm-text";
import { design } from "@/lib/source";
import { notFound } from "next/navigation";

export async function getDesignMarkdown(
  slug: string[] | undefined,
  flavor: LLMRenderContext["flavor"],
) {
  if (!slug || slug.length === 0) {
    return [
      "# Design",
      "",
      "The design system: actions, inputs, display, overlays, and navigation.",
      "",
      ...design.getPages().map((page) => {
        const description = page.data.description
          ? `: ${page.data.description}`
          : "";
        return `- [${page.data.title}](${page.url})${description}`;
      }),
    ].join("\n");
  }

  const page = design.getPage(slug);
  if (!page) notFound();

  return getLLMText(page, { flavor });
}

export function getDesignMarkdownStaticParams() {
  return design.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
