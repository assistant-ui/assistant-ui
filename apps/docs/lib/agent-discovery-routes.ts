export const AGENT_DISCOVERY_ROUTES = {
  agents: "/AGENTS.md",
  agentsWellKnown: "/.well-known/AGENTS.md",
  skill: "/skill.md",
  skillWellKnown: "/.well-known/skill.md",
  manifest: "/.well-known/agent.json",
  manifestAlias: "/.well-known/agent",
  apiCatalog: "/.well-known/api-catalog",
  skillsIndex: "/.well-known/agent-skills/index.json",
  siteSkill: "/.well-known/agent-skills/assistant-ui-docs/SKILL.md",
  sitemap: "/sitemap.md",
  sitemapWellKnown: "/.well-known/sitemap.md",
} as const;

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
    source: AGENT_DISCOVERY_ROUTES.manifestAlias,
    destination: AGENT_DISCOVERY_ROUTES.manifest,
  },
  {
    source: AGENT_DISCOVERY_ROUTES.sitemapWellKnown,
    destination: AGENT_DISCOVERY_ROUTES.sitemap,
  },
] as const;
