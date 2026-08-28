import { BASE_URL } from "./constants";
import { AGENT_DISCOVERY_ROUTES } from "./agent-discovery-routes";

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
  const markdownUrl = `${BASE_URL}${page.url}.md`;
  const description = page.data.description
    ? `: ${page.data.description.slice(0, 120)}`
    : "";
  list.push(`- [${page.data.title}](${markdownUrl})${description}`);
  map.set(section, list);
}

export function buildLLMSIndex(
  docsPages: LLMIndexPage[],
  tapPages: LLMIndexPage[],
  examplesPages: LLMIndexPage[],
  standalonePages: LLMIndexPage[] = [],
) {
  const lines: string[] = [];
  lines.push("# assistant-ui");
  lines.push("");
  lines.push("> React components for AI chat interfaces");
  lines.push("");
  lines.push("## LLM Documentation Files");
  lines.push("");
  lines.push(
    `- [Full documentation](${BASE_URL}/llms-full.txt): every documentation page rendered into one large text file.`,
  );
  lines.push(
    "- Per-page markdown: append `.md` to any docs page URL. `.mdx` is kept as a backwards-compatible alias for agents that request source-style URLs. For example, `/docs/installation.md` and `/docs/installation.mdx` both return markdown for `/docs/installation`.",
  );
  lines.push(
    "- Markdown by Accept header: requesting a docs, examples, standalone or tap docs page with `Accept: text/markdown` also returns that page's markdown.",
  );
  lines.push(
    "- Use the index below to choose a specific page. Remove the `.md` or `.mdx` suffix to open the human-readable docs page.",
  );
  lines.push("");
  lines.push("## Agent Discovery");
  lines.push("");
  lines.push(
    `- [Agent instructions](${BASE_URL}${AGENT_DISCOVERY_ROUTES.agents})`,
    `- [Site skill](${BASE_URL}${AGENT_DISCOVERY_ROUTES.skill})`,
    `- [API catalog](${BASE_URL}${AGENT_DISCOVERY_ROUTES.apiCatalog})`,
    `- [Agent Skills index](${BASE_URL}${AGENT_DISCOVERY_ROUTES.skillsIndex})`,
    `- [Markdown sitemap](${BASE_URL}${AGENT_DISCOVERY_ROUTES.sitemap})`,
    `- [Documentation MCP endpoint](${BASE_URL}/mcp)`,
  );
  lines.push("");
  lines.push("## Table of Contents");

  const map = new Map<string, string[]>();

  for (const page of docsPages) {
    addPageToSection(map, page.slugs[0] || "root", page);
  }

  for (const page of tapPages) {
    addPageToSection(map, "tap", page);
  }

  for (const page of examplesPages) {
    addPageToSection(map, "examples", page);
  }

  for (const page of standalonePages) {
    addPageToSection(map, "standalone", page);
  }

  for (const [key, value] of map) {
    lines.push("");
    lines.push(`### ${key}`);
    lines.push("");
    lines.push(value.join("\n"));
  }

  return lines.join("\n");
}
