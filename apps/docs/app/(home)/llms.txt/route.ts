import { source } from "@/lib/source";
import { BASE_URL } from "@/lib/constants";

export const revalidate = false;

export async function GET() {
  const lines: string[] = [];
  lines.push("# assistant-ui");
  lines.push("");
  lines.push("> React components for AI chat interfaces");
  lines.push("");
  lines.push("## LLM Documentation Files");
  lines.push("");
  lines.push(
    `- [Full documentation](${BASE_URL}/llms-full.txt): all docs pages rendered into one large text file.`,
  );
  lines.push(
    "- Per-page markdown: append `.mdx` to any docs page URL. For example, `/docs/getting-started.mdx` returns the markdown for `/docs/getting-started`.",
  );
  lines.push(
    "- Markdown by Accept header: requesting a docs page with `Accept: text/markdown` also returns that page's markdown.",
  );
  lines.push(
    "- Use the index below to choose a specific page. Remove the `.mdx` suffix to open the human-readable docs page.",
  );
  lines.push("");
  lines.push("## Table of Contents");

  const map = new Map<string, string[]>();

  for (const page of source.getPages()) {
    const dir = page.slugs[0] || "root";
    const list = map.get(dir) ?? [];
    const markdownUrl = `${BASE_URL}${page.url}.mdx`;
    list.push(
      `- [${page.data.title}](${markdownUrl}): ${page.data.description || ""}`,
    );
    map.set(dir, list);
  }

  for (const [key, value] of map) {
    lines.push("");
    lines.push(`### ${key}`);
    lines.push("");
    lines.push(value.join("\n"));
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
