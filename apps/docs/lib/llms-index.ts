import { BASE_URL } from "./constants";

type LLMIndexPage = {
  url: string;
  slugs: string[];
  data: {
    title: string;
    description?: string | undefined;
  };
};

function addPageToSection(
  map: Map<string, string[]>,
  section: string,
  page: LLMIndexPage,
) {
  const list = map.get(section) ?? [];
  const markdownUrl = `${BASE_URL}${page.url}.mdx`;
  list.push(
    `- [${page.data.title}](${markdownUrl}): ${page.data.description || ""}`,
  );
  map.set(section, list);
}

export function buildLLMSIndex(
  docsPages: LLMIndexPage[],
  examplesPages: LLMIndexPage[],
) {
  const lines: string[] = [];
  lines.push("# assistant-ui");
  lines.push("");
  lines.push("> React components for AI chat interfaces");
  lines.push("");
  lines.push("## LLM Documentation Files");
  lines.push("");
  lines.push(
    `- [Full documentation](${BASE_URL}/llms-full.txt): all docs and examples pages rendered into one large text file.`,
  );
  lines.push(
    "- Per-page markdown: append `.mdx` to any docs page URL. For example, `/docs/getting-started.mdx` returns the markdown for `/docs/getting-started`, and `/examples/ai-sdk.mdx` returns the markdown for `/examples/ai-sdk`.",
  );
  lines.push(
    "- Markdown by Accept header: requesting a docs or examples page with `Accept: text/markdown` also returns that page's markdown.",
  );
  lines.push(
    "- Use the index below to choose a specific page. Remove the `.mdx` suffix to open the human-readable docs page.",
  );
  lines.push("");
  lines.push("## Table of Contents");

  const map = new Map<string, string[]>();

  for (const page of docsPages) {
    addPageToSection(map, page.slugs[0] || "root", page);
  }

  for (const page of examplesPages) {
    addPageToSection(map, "examples", page);
  }

  for (const [key, value] of map) {
    lines.push("");
    lines.push(`### ${key}`);
    lines.push("");
    lines.push(value.join("\n"));
  }

  return lines.join("\n");
}
