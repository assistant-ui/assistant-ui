import { getLLMText, type LLMRenderContext } from "@/lib/get-llm-text";
import { design } from "@/lib/source";

export async function getDesignMarkdown(
  slug: string[] | undefined,
  flavor: LLMRenderContext["flavor"],
) {
  // /design/components lists the same components as /design.
  if (!slug || slug.length === 0 || slug.join("/") === "components") {
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
  if (!page) return null;

  return getLLMText(page, { flavor });
}

export function getDesignMarkdownStaticParams() {
  return design.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
