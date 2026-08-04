import { describe, expect, it } from "vitest";
import { AGENT_DISCOVERY_ROUTES } from "./agent-discovery-routes";
import { BASE_URL } from "./constants";
import { buildLLMSIndex } from "./llms-index";

const DISCOVERY_PATHS = [
  AGENT_DISCOVERY_ROUTES.agents,
  AGENT_DISCOVERY_ROUTES.skill,
  AGENT_DISCOVERY_ROUTES.apiCatalog,
  AGENT_DISCOVERY_ROUTES.skillsIndex,
  AGENT_DISCOVERY_ROUTES.sitemap,
  "/mcp",
];

describe("buildLLMSIndex", () => {
  it.each(DISCOVERY_PATHS)(
    "advertises the public discovery surface at %s",
    (path) => {
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

      expect(index).toContain(`${BASE_URL}${path}`);
    },
  );
});
