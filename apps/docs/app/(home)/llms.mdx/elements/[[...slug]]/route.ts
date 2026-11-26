import { cacheLife } from "next/cache";
import { getLLMText } from "@/lib/get-llm-text";
import { elementsDocs } from "@/lib/source";
import { notFound } from "next/navigation";
import { createMarkdownResponse } from "@/lib/markdown-response";
import { missingMarkdownResponse } from "@/lib/docs-markdown";
import {
  elementGalleryMarkdown,
  elementsMarkdownPages,
  vocabularyMarkdown,
} from "@/lib/elements-markdown";
import { getElement } from "@/components/pages/elements/registry";

async function getMarkdown(slug: string[] | undefined) {
  "use cache";
  cacheLife("max");
  if (!slug || slug.length === 0) {
    const lines = [
      "# Elements",
      "",
      "Chat UI components: usage and wiring guides for the element catalog.",
      "",
      ...elementsMarkdownPages().map((page) => {
        const description = page.data.description
          ? `: ${page.data.description}`
          : "";
        return `- [${page.data.title}](${page.url})${description}`;
      }),
    ];

    return lines.join("\n");
  }

  const page = elementsDocs.getPage(slug);
  if (page) return getLLMText(page);
  if (slug.length !== 1) return null;
  // Gallery pages without an MDX page, and the vocabulary page, are built
  // from the registry, as their HTML pages are.
  return slug[0] === "vocabulary"
    ? vocabularyMarkdown()
    : elementGalleryMarkdown(slug[0]!);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  if (slug && slug.length > 0 && !hasElementsMarkdown(slug)) {
    return missingMarkdownResponse(
      `/elements/${slug.join("/")}`,
      elementsMarkdownPages(),
    );
  }
  const markdown = await getMarkdown(slug);
  if (markdown === null) notFound();
  return createMarkdownResponse(markdown);
}

function hasElementsMarkdown(slug: string[]) {
  if (elementsDocs.getPage(slug)) return true;
  return (
    slug.length === 1 && (slug[0] === "vocabulary" || !!getElement(slug[0]!))
  );
}

export function generateStaticParams() {
  return elementsDocs.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
