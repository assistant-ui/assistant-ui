import { describe, expect, it } from "vitest";
import {
  AGENTS_DOCUMENT,
  API_CATALOG_CONTENT_TYPE,
  buildAgentManifest,
  buildAgentSkillsIndex,
  buildApiCatalog,
  buildMarkdownSitemap,
  createDiscoveryResponse,
  createJsonDiscoveryResponse,
  sha256,
  SITE_SKILL_DOCUMENT,
} from "./agent-discovery";
import {
  AGENT_DISCOVERY_REWRITES,
  AGENT_DISCOVERY_ROUTES,
} from "./agent-discovery-routes";
import { BASE_URL } from "./constants";

describe("agent discovery", () => {
  it("publishes canonical aliases through rewrites", () => {
    expect(AGENT_DISCOVERY_REWRITES).toEqual([
      {
        source: "/.well-known/AGENTS.md",
        destination: "/AGENTS.md",
      },
      {
        source: "/.well-known/skill.md",
        destination: "/skill.md",
      },
      {
        source: "/.well-known/agent",
        destination: "/.well-known/agent.json",
      },
      {
        source: "/.well-known/sitemap.md",
        destination: "/sitemap.md",
      },
    ]);
  });

  it("cross-links the site skill and agent instructions", () => {
    for (const path of [
      AGENT_DISCOVERY_ROUTES.agents,
      AGENT_DISCOVERY_ROUTES.skill,
      AGENT_DISCOVERY_ROUTES.manifest,
      AGENT_DISCOVERY_ROUTES.apiCatalog,
      AGENT_DISCOVERY_ROUTES.skillsIndex,
      AGENT_DISCOVERY_ROUTES.sitemap,
      "/llms.txt",
      "/mcp",
    ]) {
      expect(SITE_SKILL_DOCUMENT).toContain(`${BASE_URL}${path}`);
      expect(AGENTS_DOCUMENT).toContain(`${BASE_URL}${path}`);
    }
  });

  it("indexes the exact published skill document", () => {
    const index = buildAgentSkillsIndex();

    expect(index.$schema).toBe(
      "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    );
    expect(index.skills).toHaveLength(1);
    expect(index.skills[0]).toMatchObject({
      name: "assistant-ui-docs",
      type: "skill-md",
      url: `${BASE_URL}${AGENT_DISCOVERY_ROUTES.siteSkill}`,
      digest: `sha256:${sha256(SITE_SKILL_DOCUMENT)}`,
    });
  });

  it("advertises only capabilities that the docs serve", () => {
    const manifest = buildAgentManifest();

    expect(manifest.baseUrl).toBe(BASE_URL);
    expect(manifest.capabilities).toEqual({
      markdownRoutes: true,
      llms: true,
      mcp: true,
      search: true,
      skills: true,
      sitemap: true,
      apiCatalog: true,
    });
    expect(manifest.mcp.endpoint).toBe(`${BASE_URL}/mcp`);
    expect(manifest.mcp.tools).toEqual([
      "list_pages",
      "get_navigation",
      "search_docs",
      "read_page",
    ]);
  });

  it("builds a profiled API catalog around the MCP service", () => {
    const catalog = buildApiCatalog();
    const root = catalog.linkset[0];

    expect(root.anchor).toBe(`${BASE_URL}${AGENT_DISCOVERY_ROUTES.apiCatalog}`);
    expect(root["api-catalog"]).toEqual([
      {
        href: `${BASE_URL}${AGENT_DISCOVERY_ROUTES.apiCatalog}`,
        type: "application/linkset+json",
        title: "API catalog",
      },
    ]);
    expect(root.item).toContainEqual({
      href: `${BASE_URL}/mcp`,
      type: "application/json",
      title: "Documentation MCP endpoint",
    });
    expect(root["service-meta"]).toContainEqual({
      href: `${BASE_URL}${AGENT_DISCOVERY_ROUTES.manifest}`,
      type: "application/json",
      title: "Agent discovery manifest",
    });
  });

  it("renders a stable Markdown sitemap with page metadata", () => {
    const sitemap = buildMarkdownSitemap([
      {
        title: "Documentation",
        pages: [
          {
            url: "/docs/z-last",
            data: { title: "Last" },
          },
          {
            url: "/docs/first",
            data: {
              title: "First",
              description: "Start here.",
              lastModified: new Date("2026-08-01T10:00:00.000Z"),
            },
          },
        ],
      },
    ]);

    expect(sitemap).toContain(`# assistant-ui documentation sitemap`);
    expect(sitemap).toContain(
      `- [First](${BASE_URL}/docs/first)\n  Markdown: ${BASE_URL}/docs/first.md\n  Description: Start here.\n  Last updated: 2026-08-01`,
    );
    expect(sitemap.indexOf("[First]")).toBeLessThan(sitemap.indexOf("[Last]"));
  });

  it("serves cacheable GET and body-free HEAD responses", async () => {
    const getResponse = createDiscoveryResponse("# Discovery", {
      contentType: "text/markdown; charset=utf-8",
    });
    const headResponse = createDiscoveryResponse("# Discovery", {
      contentType: "text/markdown; charset=utf-8",
      head: true,
    });

    expect(await getResponse.text()).toBe("# Discovery\n");
    expect(getResponse.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=3600",
    );
    expect(getResponse.headers.get("Link")).toContain('rel="api-catalog"');
    expect(getResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await headResponse.text()).toBe("");
    expect(headResponse.headers.get("ETag")).toBe(
      getResponse.headers.get("ETag"),
    );
  });

  it("uses the RFC 9727 media type for the API catalog response", () => {
    const response = createJsonDiscoveryResponse(buildApiCatalog(), {
      contentType: API_CATALOG_CONTENT_TYPE,
    });

    expect(response.headers.get("Content-Type")).toBe(
      'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8',
    );
  });
});
