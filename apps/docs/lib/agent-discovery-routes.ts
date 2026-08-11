import { BASE_URL } from "./constants";

export const AGENT_DISCOVERY_ROUTES = {
  agents: "/AGENTS.md",
  agentsWellKnown: "/.well-known/AGENTS.md",
  skill: "/skill.md",
  skillWellKnown: "/.well-known/skill.md",
  apiCatalog: "/.well-known/api-catalog",
  skillsIndex: "/.well-known/agent-skills/index.json",
  siteSkill: "/.well-known/agent-skills/assistant-ui-docs/SKILL.md",
  sitemap: "/sitemap.md",
  sitemapWellKnown: "/.well-known/sitemap.md",
} as const;

export const API_CATALOG_PROFILE = "https://www.rfc-editor.org/info/rfc9727";

export const API_CATALOG_LINK_HEADER = `<${BASE_URL}${AGENT_DISCOVERY_ROUTES.apiCatalog}>; rel="api-catalog"; type="application/linkset+json"; profile="${API_CATALOG_PROFILE}"`;

export const AGENT_DISCOVERY_REWRITES = [
  {
    source: AGENT_DISCOVERY_ROUTES.agentsWellKnown,
    destination: AGENT_DISCOVERY_ROUTES.agents,
  },
  {
    source: AGENT_DISCOVERY_ROUTES.skillWellKnown,
    destination: AGENT_DISCOVERY_ROUTES.skill,
  },
  {
    source: AGENT_DISCOVERY_ROUTES.sitemapWellKnown,
    destination: AGENT_DISCOVERY_ROUTES.sitemap,
  },
] as const;
