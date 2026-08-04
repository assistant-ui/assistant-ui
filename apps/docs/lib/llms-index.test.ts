import { describe, expect, it } from "vitest";
import { AGENT_DISCOVERY_ROUTES } from "./agent-discovery-routes";
import { BASE_URL } from "./constants";
import { buildLLMSIndex } from "./llms-index";

describe("buildLLMSIndex", () => {
  it("advertises the public agent discovery surfaces", () => {
    const index = buildLLMSIndex(
      [
        {
          url: "/docs",
          slugs: [],
          data: { title: "Documentation", description: "Start here." },
        },
      ],
      [],
      [],
    );

    for (const path of [
      AGENT_DISCOVERY_ROUTES.agents,
      AGENT_DISCOVERY_ROUTES.skill,
      AGENT_DISCOVERY_ROUTES.manifest,
      AGENT_DISCOVERY_ROUTES.apiCatalog,
      AGENT_DISCOVERY_ROUTES.skillsIndex,
      AGENT_DISCOVERY_ROUTES.sitemap,
      "/mcp",
    ]) {
      expect(index).toContain(`${BASE_URL}${path}`);
    }
  });
});
