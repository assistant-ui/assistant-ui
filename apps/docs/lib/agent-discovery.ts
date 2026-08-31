import { createHash } from "node:crypto";
import { BASE_URL } from "./constants";
import {
  AGENT_DISCOVERY_ROUTES,
  API_CATALOG_LINK_HEADER,
  API_CATALOG_PROFILE,
} from "./agent-discovery-routes";
import {
  DESIGN_DOCUMENT,
  DESIGN_SKILL_DESCRIPTION,
  DESIGN_SKILL_NAME,
} from "./design-law";

const CACHE_CONTROL = "no-cache, must-revalidate";
const AGENT_SKILLS_SCHEMA =
  "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

export const API_CATALOG_CONTENT_TYPE = `application/linkset+json; profile="${API_CATALOG_PROFILE}"; charset=utf-8`;

const absoluteUrl = (path: string) => `${BASE_URL}${path}`;

const AGENT_SKILL_DESCRIPTION =
  "Use assistant-ui documentation to implement and troubleshoot AI chat interfaces across React, React Native, and terminal applications.";

export const SITE_SKILL_DOCUMENT = `---
name: assistant-ui-docs
description: ${JSON.stringify(AGENT_SKILL_DESCRIPTION)}
---

# assistant-ui documentation

Use this skill when implementing, configuring, migrating, or troubleshooting assistant-ui.

## Start here

1. Read the documentation index at ${absoluteUrl("/llms.txt")}.
2. Fetch only the relevant page through its canonical \`.md\` URL.
3. Use ${absoluteUrl(AGENT_DISCOVERY_ROUTES.sitemap)} when the page name is unknown.
4. Use the MCP endpoint at ${absoluteUrl("/mcp")} for navigation, search, and page retrieval.

## Working rules

- Prefer focused \`.md\` pages over loading the complete documentation file.
- Confirm the runtime and platform before applying an example.
- Preserve package names, imports, and public API spelling exactly.
- Use the human-readable page URL when citing documentation to a user.
- Verify implementation steps with the checks documented on the relevant page.
- Read ${absoluteUrl(AGENT_DISCOVERY_ROUTES.design)} before drawing, restyling, or extending any assistant-ui surface.

## Discovery

- Agent instructions: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.agents)}
- Site skill: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.skill)}
- Design law: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.design)}
- API catalog: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.apiCatalog)}
- Agent Skills index: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.skillsIndex)}
- Markdown sitemap: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.sitemap)}
- LLM index: ${absoluteUrl("/llms.txt")}
- Full documentation: ${absoluteUrl("/llms-full.txt")}
- MCP: ${absoluteUrl("/mcp")}
`;

export const AGENTS_DOCUMENT = `# Agent instructions for assistant-ui documentation

Base URL: ${BASE_URL}

Use these instructions when reading assistant-ui documentation or implementing assistant-ui in a project.

## Retrieval workflow

1. Start with ${absoluteUrl("/llms.txt")} or ${absoluteUrl(AGENT_DISCOVERY_ROUTES.sitemap)}.
2. Fetch the smallest relevant page by appending \`.md\` to its canonical documentation URL.
3. Use ${absoluteUrl("/mcp")} when tool-based navigation, search, or page reads are available.
4. Load ${absoluteUrl("/llms-full.txt")} only when broad cross-page analysis is required.

## Working rules

- Prefer machine-readable Markdown over scraping rendered HTML.
- Identify the target platform, runtime, and package version before changing code.
- Keep examples within their documented framework and runtime boundaries.
- Preserve exact package names, exports, hooks, and component names.
- Cite the canonical human-readable URL when returning documentation to a user.
- Do not invent routes or APIs; use the index, sitemap, or MCP navigation when uncertain.
- Read ${absoluteUrl(AGENT_DISCOVERY_ROUTES.design)} before drawing, restyling, or extending any assistant-ui surface.

## Public discovery routes

- Agent instructions: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.agents)}
- Site skill: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.skill)}
- Design law: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.design)}
- API catalog: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.apiCatalog)}
- Agent Skills index: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.skillsIndex)}
- Markdown sitemap: ${absoluteUrl(AGENT_DISCOVERY_ROUTES.sitemap)}
- LLM index: ${absoluteUrl("/llms.txt")}
- MCP: ${absoluteUrl("/mcp")}
`;

export function sha256(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export function buildAgentSkillsIndex() {
  return {
    $schema: AGENT_SKILLS_SCHEMA,
    skills: [
      {
        name: "assistant-ui-docs",
        type: "skill-md",
        description: AGENT_SKILL_DESCRIPTION,
        url: absoluteUrl(AGENT_DISCOVERY_ROUTES.siteSkill),
        digest: `sha256:${sha256(SITE_SKILL_DOCUMENT)}`,
      },
      {
        name: DESIGN_SKILL_NAME,
        type: "skill-md",
        description: DESIGN_SKILL_DESCRIPTION,
        url: absoluteUrl(AGENT_DISCOVERY_ROUTES.design),
        digest: `sha256:${sha256(DESIGN_DOCUMENT)}`,
      },
    ],
  };
}

type ApiCatalogTarget = {
  href: string;
  type: string;
  title: string;
};

export function buildApiCatalog() {
  const catalogUrl = absoluteUrl(AGENT_DISCOVERY_ROUTES.apiCatalog);
  const serviceDocs: ApiCatalogTarget[] = [
    { href: absoluteUrl("/docs"), type: "text/html", title: "Documentation" },
    {
      href: absoluteUrl("/docs.md"),
      type: "text/markdown",
      title: "Documentation Markdown",
    },
    {
      href: absoluteUrl(AGENT_DISCOVERY_ROUTES.agents),
      type: "text/markdown",
      title: "Agent instructions",
    },
    {
      href: absoluteUrl(AGENT_DISCOVERY_ROUTES.skill),
      type: "text/markdown",
      title: "Site skill",
    },
    {
      href: absoluteUrl(AGENT_DISCOVERY_ROUTES.design),
      type: "text/markdown",
      title: "Design law",
    },
    {
      href: absoluteUrl("/llms.txt"),
      type: "text/plain",
      title: "LLM documentation index",
    },
    {
      href: absoluteUrl(AGENT_DISCOVERY_ROUTES.sitemap),
      type: "text/markdown",
      title: "Documentation sitemap",
    },
  ];
  const serviceMetadata: ApiCatalogTarget[] = [
    {
      href: absoluteUrl(AGENT_DISCOVERY_ROUTES.skillsIndex),
      type: "application/json",
      title: "Agent Skills discovery index",
    },
  ];
  const mcpTarget = {
    href: absoluteUrl("/mcp"),
    title: "Documentation MCP endpoint",
  };

  return {
    linkset: [
      {
        anchor: catalogUrl,
        item: [mcpTarget],
      },
      {
        anchor: mcpTarget.href,
        "service-doc": serviceDocs,
        "service-meta": serviceMetadata,
      },
    ],
  };
}

export type SitemapPage = {
  url: string;
  data: {
    title: string;
    description?: string | undefined;
    lastModified?: Date | string | undefined;
  };
};

function formatDate(value: Date | string | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString().slice(0, 10);
}

export function buildMarkdownSitemap(
  sections: Array<{ title: string; pages: SitemapPage[] }>,
) {
  const lines = [
    "# assistant-ui documentation sitemap",
    "",
    `Base URL: ${BASE_URL}`,
    "",
  ];

  for (const section of sections) {
    lines.push(`## ${section.title}`, "");

    const pages = [...section.pages].sort((left, right) =>
      left.url.localeCompare(right.url),
    );
    for (const page of pages) {
      lines.push(`- [${page.data.title}](${absoluteUrl(page.url)})`);
      lines.push(`  Markdown: ${absoluteUrl(`${page.url}.md`)}`);
      if (page.data.description) {
        lines.push(`  Description: ${page.data.description}`);
      }
      const lastModified = formatDate(page.data.lastModified);
      if (lastModified) lines.push(`  Last updated: ${lastModified}`);
      lines.push("");
    }
  }

  return `${lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
}

export function createDiscoveryResponse(
  content: string,
  options: {
    contentType: string;
    head?: boolean;
    digest?: string;
  },
) {
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  const digest = options.digest ?? sha256(normalized);

  return new Response(options.head ? null : normalized, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "ETag, Link",
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": options.contentType,
      ETag: `"sha256-${digest}"`,
      Link: API_CATALOG_LINK_HEADER,
    },
  });
}

export function createJsonDiscoveryResponse(
  value: unknown,
  options: { head?: boolean; contentType?: string } = {},
) {
  return createDiscoveryResponse(JSON.stringify(value, null, 2), {
    contentType: options.contentType ?? "application/json; charset=utf-8",
    head: options.head ?? false,
  });
}
