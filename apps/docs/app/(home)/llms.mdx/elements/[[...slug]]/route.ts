import { cacheLife } from "next/cache";
import { getLLMText } from "@/lib/get-llm-text";
import { elementsDocs } from "@/lib/source";
import { notFound } from "next/navigation";
import { createMarkdownResponse } from "@/lib/markdown-response";
import {
  kebabCaseSlug,
  missingMarkdownResponse,
  sameIgnoringCase,
} from "@/lib/docs-markdown";
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
    // An element named as in code: ThreadList is thread-list.
    const kebab = kebabCaseSlug(slug);
    if (kebab && hasElementsMarkdown(kebab)) {
      // Only the case differs: answer in place rather than redirect to a url
      // that matches this one where urls are matched without case.
      const markdown = sameIgnoringCase(kebab, slug)
        ? await getMarkdown(kebab)
        : null;
      if (markdown !== null) return createMarkdownResponse(markdown);
      return new Response(null, {
        status: 307,
        headers: { Location: `/elements/${kebab.join("/")}.md` },
      });
    }
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
