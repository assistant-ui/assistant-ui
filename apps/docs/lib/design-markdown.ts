import { cacheLife } from "next/cache";
import { missingMarkdownResponse } from "@/lib/docs-markdown";
import { getLLMText, type LLMRenderContext } from "@/lib/get-llm-text";
import { createMarkdownResponse } from "@/lib/markdown-response";
import { design } from "@/lib/source";

export async function getDesignMarkdown(
  slug: string[] | undefined,
  flavor: LLMRenderContext["flavor"],
) {
  "use cache";
  cacheLife("max");
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

export async function getDesignMarkdownResponse(
  slug: string[] | undefined,
  flavor: LLMRenderContext["flavor"],
) {
  const markdown = await getDesignMarkdown(slug, flavor);
  if (markdown === null) {
    return missingMarkdownResponse(
      ["/design", ...(slug ?? [])].join("/"),
      design.getPages(),
    );
  }
  return createMarkdownResponse(markdown);
}

export function getDesignMarkdownStaticParams() {
  return design.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
