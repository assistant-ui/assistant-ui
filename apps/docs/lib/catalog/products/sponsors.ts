import type { CatalogItem } from "../types";
import { assistantUi } from "./assistant-ui";

type Sponsor = Pick<
  CatalogItem,
  "slug" | "name" | "tagline" | "href" | "docs" | "agentMinutes"
>;

const sponsor = (entry: Sponsor): CatalogItem => ({
  ...entry,
  purchase: "cart",
  hidden: true,
  glyph: "cloud",
});

/** The main installer as a cart product, so it can join a setup alongside the sponsors. */
export const sponsorAssistantUi: CatalogItem = {
  slug: "sponsors/assistant-ui",
  name: assistantUi.name,
  tagline: assistantUi.tagline,
  href: "/",
  docs: assistantUi.docs,
  agentMinutes: assistantUi.agentMinutes,
  purchase: "cart",
  hidden: true,
  glyph: assistantUi.glyph,
};

/** Build Personal Agents Hack sponsors; `href` and `docs` point at the sponsor's own site. */
export const SPONSOR_PRODUCTS: readonly CatalogItem[] = [
  sponsor({
    slug: "sponsors/mastra",
    name: "Mastra",
    tagline: "A TypeScript framework for agents, workflows, and memory.",
    href: "https://mastra.ai",
    docs: "https://mastra.ai/docs",
    agentMinutes: [8, 13],
  }),
  sponsor({
    slug: "sponsors/neon",
    name: "Neon",
    tagline: "Serverless Postgres with branching.",
    href: "https://neon.com",
    docs: "https://neon.com/docs",
    agentMinutes: [4, 9],
  }),
  sponsor({
    slug: "sponsors/exa",
    name: "Exa",
    tagline: "Web search and page contents built for AI.",
    href: "https://exa.ai",
    docs: "https://exa.ai/docs",
    agentMinutes: [4, 6],
  }),
  sponsor({
    slug: "sponsors/kernel",
    name: "Kernel",
    tagline: "Cloud browsers for web agents and automations.",
    href: "https://www.kernel.sh",
    docs: "https://www.kernel.sh/docs",
    agentMinutes: [4, 9],
  }),
  sponsor({
    slug: "sponsors/executor",
    name: "Executor",
    tagline: "One MCP gateway that connects your agent to everything.",
    href: "https://executor.sh",
    docs: "https://executor.sh/docs",
    agentMinutes: [4, 6],
  }),
  sponsor({
    slug: "sponsors/fly",
    name: "Fly.io",
    tagline: "Run your app on servers close to your users.",
    href: "https://fly.io",
    docs: "https://fly.io/docs",
    agentMinutes: [4, 9],
  }),
  sponsor({
    slug: "sponsors/agentmail",
    name: "AgentMail",
    tagline: "Email inboxes your agent can send and receive from.",
    href: "https://www.agentmail.to",
    docs: "https://docs.agentmail.to",
    agentMinutes: [4, 6],
  }),
  sponsor({
    slug: "sponsors/coderabbit",
    name: "CodeRabbit",
    tagline: "AI code reviews on every pull request and in your terminal.",
    href: "https://www.coderabbit.ai",
    docs: "https://docs.coderabbit.ai",
    agentMinutes: [2, 3],
  }),
];
