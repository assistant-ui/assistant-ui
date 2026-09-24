import { describe, expect, it } from "vitest";
import {
  AGENTS_DOCUMENT,
  agentSkillDocument,
  API_CATALOG_CONTENT_TYPE,
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
  agentSkillPath,
  API_CATALOG_LINK_HEADER,
} from "./agent-discovery-routes";
import { DESIGN_DOCUMENT } from "./design-law";
import { getSkills } from "./agent-skills";
import { DESIGN_SECTIONS } from "@/components/pages/design/registry-meta";
import { BASE_URL } from "./constants";

const PUBLIC_DISCOVERY_PATHS = [
  AGENT_DISCOVERY_ROUTES.agents,
  AGENT_DISCOVERY_ROUTES.skill,
  AGENT_DISCOVERY_ROUTES.design,
  AGENT_DISCOVERY_ROUTES.apiCatalog,
  AGENT_DISCOVERY_ROUTES.skillsIndex,
  AGENT_DISCOVERY_ROUTES.sitemap,
  "/llms.txt",
  "/mcp",
];

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
        source: "/.well-known/design.md",
        destination: "/design.md",
      },
      {
        source: "/.well-known/sitemap.md",
        destination: "/sitemap.md",
      },
    ]);
  });

  it("publishes a global RFC 9727 API catalog relation", () => {
    expect(API_CATALOG_LINK_HEADER).toBe(
      `<${BASE_URL}${AGENT_DISCOVERY_ROUTES.apiCatalog}>; rel="api-catalog"; type="application/linkset+json"; profile="https://www.rfc-editor.org/info/rfc9727"`,
    );
  });

  it.each(PUBLIC_DISCOVERY_PATHS)(
    "cross-links %s from the site documents",
    (path) => {
      expect(SITE_SKILL_DOCUMENT).toContain(`${BASE_URL}${path}`);
      expect(AGENTS_DOCUMENT).toContain(`${BASE_URL}${path}`);
    },
  );

  it("indexes the exact published skill document", () => {
    const index = buildAgentSkillsIndex();

    expect(index.$schema).toBe(
      "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    );
    expect(index.skills[0]).toMatchObject({
      name: "assistant-ui-docs",
      type: "skill-md",
      url: `${BASE_URL}${AGENT_DISCOVERY_ROUTES.siteSkill}`,
      digest: `sha256:${sha256(SITE_SKILL_DOCUMENT)}`,
    });
    expect(index.skills[1]).toMatchObject({
      name: "assistant-ui-design",
      type: "skill-md",
      url: `${BASE_URL}${AGENT_DISCOVERY_ROUTES.design}`,
      digest: `sha256:${sha256(DESIGN_DOCUMENT)}`,
    });
  });

  it("indexes every repo skill after the site skills, digesting the served document", () => {
    const skills = getSkills();
    const index = buildAgentSkillsIndex();

    expect(skills.length).toBeGreaterThanOrEqual(17);
    expect(index.skills.slice(2)).toEqual(
      skills.map((skill) => ({
        name: skill.name,
        type: "skill-md",
        description: skill.description,
        url: `${BASE_URL}${AGENT_DISCOVERY_ROUTES.skillsRoot}/${skill.name}/SKILL.md`,
        digest: `sha256:${sha256(agentSkillDocument(skill))}`,
      })),
    );
    expect(
      index.skills
        .filter(({ description }) => !description || description.length > 1024)
        .map(({ name, description }) => `${name} (${description.length})`),
    ).toEqual([]);
    expect(new Set(index.skills.map((entry) => entry.name)).size).toBe(
      index.skills.length,
    );
    expect(agentSkillPath("tools")).toBe(
      "/.well-known/agent-skills/tools/SKILL.md",
    );
  });

  it("refuses a repo skill that shadows a site skill", () => {
    expect(() =>
      buildAgentSkillsIndex([
        { name: "assistant-ui-docs", description: "x", content: "y" },
      ]),
    ).toThrow("assistant-ui-docs collides");
  });

  it("wraps a repo skill in agentskills frontmatter", () => {
    const document = agentSkillDocument({
      name: "tools",
      description: 'Defines "model" tools.',
      frontmatter: { license: "MIT" },
      content: "# Tools",
    });
    expect(document).toBe(
      '---\nname: tools\ndescription: "Defines \\"model\\" tools."\nlicense: "MIT"\n---\n\n# Tools\n',
    );
  });

  it("points agents at the repo skills from the site documents", () => {
    for (const document of [SITE_SKILL_DOCUMENT, AGENTS_DOCUMENT]) {
      expect(document).toContain(
        `task-shaped skill for the area at hand (setup, tools, runtime, streaming, ...) from the Agent Skills index at ${BASE_URL}${AGENT_DISCOVERY_ROUTES.skillsIndex}`,
      );
    }
  });

  it("serves the design law with its frontmatter, registers, and kit roster", () => {
    expect(DESIGN_DOCUMENT).toMatch(/^---\nname: assistant-ui-design\n/);

    for (const heading of [
      "## The governing metaphor",
      "## Priority order",
      "## Register: shape",
      "## Register: color",
      "## Register: type",
      "## Register: the line budget",
      "## How a page is composed",
      "## Reject these",
      "## The closed API",
      "## Traps",
      "## The kit roster",
    ]) {
      expect(DESIGN_DOCUMENT).toContain(heading);
    }

    for (const section of DESIGN_SECTIONS) {
      expect(DESIGN_DOCUMENT).toContain(`### ${section.label}`);
      for (const component of section.components) {
        expect(DESIGN_DOCUMENT).toContain(
          `[${component.name}](${BASE_URL}/design/components/${component.slug})`,
        );
      }
    }
  });

  it("builds a profiled API catalog around the MCP service", () => {
    const catalog = buildApiCatalog();
    const mcpTarget = {
      href: `${BASE_URL}/mcp`,
      title: "Documentation MCP endpoint",
    };

    expect(catalog.linkset[0]).toEqual({
      anchor: `${BASE_URL}${AGENT_DISCOVERY_ROUTES.apiCatalog}`,
      item: [mcpTarget],
    });
    expect(catalog.linkset[1]).toMatchObject({
      anchor: mcpTarget.href,
      "service-meta": [
        {
          href: `${BASE_URL}${AGENT_DISCOVERY_ROUTES.skillsIndex}`,
          type: "application/json",
          title: "Agent Skills discovery index",
        },
      ],
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
            },
          },
        ],
      },
    ]);

    expect(sitemap).toContain(`# assistant-ui documentation sitemap`);
    expect(sitemap).toContain(
      `- [First](${BASE_URL}/docs/first)\n  Markdown: ${BASE_URL}/docs/first.md\n  Description: Start here.\n\n`,
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
      "no-cache, must-revalidate",
    );
    expect(getResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(getResponse.headers.get("Link")).toBe(API_CATALOG_LINK_HEADER);
    expect(getResponse.headers.get("X-Robots-Tag")).toBeNull();
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
