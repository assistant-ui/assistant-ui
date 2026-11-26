import { sha256 } from "./sha256";
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

type MarkdownPage = {
  url: string;
  data: { title: string; description?: string | undefined };
};

const STOP_WORDS = new Set(["docs", "md", "mdx", "index"]);

function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function bigrams(text: string): string[] {
  const grams: string[] = [];
  for (let i = 0; i < text.length - 1; i += 1) grams.push(text.slice(i, i + 2));
  return grams;
}

// Dice similarity over letter pairs, so a typo or a near name still scores.
function similarity(a: string, b: string): number {
  if (a === b) return a ? 1 : 0;
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.length === 0 || right.length === 0) return 0;
  const pool = [...right];
  let shared = 0;
  for (const gram of left) {
    const index = pool.indexOf(gram);
    if (index !== -1) {
      shared += 1;
      pool.splice(index, 1);
    }
  }
  return (2 * shared) / (left.length + right.length);
}

function segmentsOf(pathname: string): string[] {
  return pathname
    .replace(/\.mdx?$/i, "")
    .toLowerCase()
    .split("/")
    .filter(Boolean);
}

/**
 * The pages closest to a path that has none. A word the path shares with a
 * page's url or title counts by how rare it is across the pages, and double
 * when it is in the path's last segment; a last segment spelled almost like
 * the page's (a plural, a typo) counts too. Used for the body of a markdown
 * 404, so an agent that guessed a url gets the real ones instead of a dead
 * end.
 */
export function nearestPages<Page extends MarkdownPage>(
  pathname: string,
  pages: readonly Page[],
  limit = 5,
): Page[] {
  const segments = segmentsOf(pathname);
  const lastSegment = segments.at(-1) ?? "";
  const last = lastSegment.replace(/[^a-z0-9]/g, "");
  const lastWords = new Set(words(lastSegment));
  const wanted = new Set(words(pathname));

  const pageWords = pages.map(
    (page) => new Set([...words(page.url), ...words(page.data.title)]),
  );
  const frequency = new Map<string, number>();
  for (const set of pageWords) {
    for (const word of set) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }
  const rarity = (word: string) =>
    Math.log((pages.length + 1) / ((frequency.get(word) ?? 0) + 1));

  return pages
    .map((page, i) => {
      let score = 0;
      let named = false;
      for (const word of wanted) {
        if (!pageWords[i]!.has(word)) continue;
        const inName = lastWords.has(word);
        named ||= inName;
        score += rarity(word) * (inName ? 2 : 0.5);
      }
      const pageLast = (segmentsOf(page.url).at(-1) ?? "").replace(
        /[^a-z0-9]/g,
        "",
      );
      const alike = similarity(last, pageLast);
      if (alike >= 0.7) {
        named = true;
        score += 4 * alike;
      }
      // A page that shares only the folder is no nearer than its siblings.
      return { page, score: named || lastWords.size === 0 ? score : 0 };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.page.url.length - b.page.url.length ||
        a.page.url.localeCompare(b.page.url),
    )
    .slice(0, limit)
    .map(({ page }) => page);
}

/**
 * A markdown 404: says there is no page at the path and lists the nearest
 * pages as markdown links, with the index to fall back on.
 */
export function missingMarkdownResponse(
  pathname: string,
  pages: readonly MarkdownPage[],
  // The platform and view query of the request, kept on the /docs links.
  search = "",
): Response {
  const nearest = nearestPages(pathname, pages);
  const lines = [
    "# Page not found",
    "",
    `There is no page at \`${pathname.replace(/`/g, "")}\`.`,
  ];
  if (nearest.length > 0) {
    lines.push(
      "",
      "Nearest pages:",
      "",
      ...nearest.map((page) => {
        const description = page.data.description
          ? `: ${page.data.description}`
          : "";
        const query =
          search && page.url.startsWith("/docs") ? `?${search}` : "";
        return `- [${page.data.title}](${page.url}.md${query})${description}`;
      }),
    );
  }
  lines.push("", "Every page is listed in [llms.txt](/llms.txt).", "");

  const body = lines.join("\n");
  return new Response(body, {
    status: 404,
    headers: {
      "Cache-Control": "no-cache, must-revalidate",
      ETag: `"sha256-${sha256(body)}"`,
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}

/**
 * The page a slug in the wrong case names: the page whose slug matches when
 * case is ignored, or else the kebab-case form of an API name. The markdown
 * routes answer `/docs/guides/Attachments.md` with the attachments page and
 * redirect `/docs/primitives/ThreadList.md` to the thread-list page.
 */
export function pageInAnyCase<Page extends { slugs: string[] }>(
  pages: readonly Page[],
  slug: readonly string[],
): Page | undefined {
  const wanted = slug.join("/").toLowerCase();
  const kebab = (kebabCaseSlug(slug) ?? slug).join("/");
  return (
    pages.find((page) => page.slugs.join("/").toLowerCase() === wanted) ??
    pages.find((page) => page.slugs.join("/") === kebab)
  );
}

export function sameIgnoringCase(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.join("/").toLowerCase() === right.join("/").toLowerCase();
}

/**
 * The kebab-case slug for one an agent wrote in another case, as API names
 * appear in code: `primitives/ThreadList` and `primitives/thread_list` both
 * name `primitives/thread-list`. Null when the slug is already kebab-case.
 * Only the markdown routes and MCP use it; browser urls stay exact.
 */
export function kebabCaseSlug(slug: readonly string[]): string[] | null {
  const kebab = slug.map((segment) =>
    segment
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
      .replace(/[_\s]+/g, "-")
      .toLowerCase(),
  );
  return kebab.every((segment, i) => segment === slug[i]) ? null : kebab;
}
