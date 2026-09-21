import type { CatalogItem } from "../types";

type Guide = Pick<
  CatalogItem,
  "slug" | "name" | "tagline" | "docs" | "agentMinutes"
>;

const guide = (entry: Guide): CatalogItem => ({
  ...entry,
  href: entry.docs,
  purchase: "cart",
  glyph: "examples",
});

const GUIDES: readonly Guide[] = [
  {
    slug: "guides/attachments",
    name: "File attachments",
    tagline:
      "Users attach images and files to messages by picker, drag-drop, or paste.",
    docs: "/docs/guides/attachments",
    agentMinutes: [3, 10],
  },
  {
    slug: "guides/speech",
    name: "Text-to-speech",
    tagline: "A read-aloud button on every assistant message.",
    docs: "/docs/guides/speech",
    agentMinutes: [3, 8],
  },
  {
    slug: "guides/dictation",
    name: "Voice dictation",
    tagline: "A microphone button that transcribes speech into the composer.",
    docs: "/docs/guides/dictation",
    agentMinutes: [3, 12],
  },
  {
    slug: "guides/latex",
    name: "LaTeX math",
    tagline: "Render LaTeX equations in chat messages with KaTeX.",
    docs: "/docs/guides/latex",
    agentMinutes: [3, 8],
  },
  {
    slug: "guides/streamdown",
    name: "Streamdown renderer",
    tagline:
      "Replace react-markdown with Streamdown for built-in Shiki, KaTeX, and Mermaid.",
    docs: "/docs/guides/streamdown",
    agentMinutes: [5, 12],
  },
  {
    slug: "guides/suggestions",
    name: "Suggested prompts",
    tagline:
      "Starter prompts on the empty thread, with optional generated follow-ups.",
    docs: "/docs/guides/suggestions",
    agentMinutes: [3, 10],
  },
  {
    slug: "guides/mentions",
    name: "@-mentions",
    tagline:
      "Type @ in the composer to pick a tool or custom item and send it as a directive.",
    docs: "/docs/guides/mentions",
    agentMinutes: [5, 15],
  },
  {
    slug: "guides/slash-commands",
    name: "Slash commands",
    tagline:
      "Type / in the composer to open a command palette that runs your callbacks.",
    docs: "/docs/guides/slash-commands",
    agentMinutes: [5, 15],
  },
  {
    slug: "guides/chain-of-thought",
    name: "Chain of thought",
    tagline:
      "Group reasoning and tool calls into one collapsible thinking section.",
    docs: "/docs/guides/chain-of-thought",
    agentMinutes: [5, 12],
  },
  {
    slug: "guides/resumable-streams",
    name: "Resumable streams",
    tagline:
      "A response keeps streaming after a reload or dropped connection and the client picks it back up.",
    docs: "/docs/guides/resumable-streams",
    agentMinutes: [10, 20],
  },
  {
    slug: "guides/devtools",
    name: "DevTools",
    tagline:
      "An in-browser panel for inspecting runtime state, model context, and events in development.",
    docs: "/docs/devtools",
    agentMinutes: [2, 5],
  },
  {
    slug: "guides/langfuse",
    name: "Langfuse tracing",
    tagline:
      "One Langfuse trace per chat turn, with LLM and tool-call spans, via OpenTelemetry.",
    docs: "/docs/integrations/observability/langfuse",
    agentMinutes: [5, 12],
  },
  {
    slug: "guides/helicone",
    name: "Helicone logging",
    tagline:
      "Log every LLM request with cost and latency by routing the provider through the Helicone proxy.",
    docs: "/docs/integrations/observability/helicone",
    agentMinutes: [3, 8],
  },
  {
    slug: "guides/langsmith",
    name: "LangSmith tracing",
    tagline: "Trace AI SDK calls into a LangSmith project with wrapAISDK.",
    docs: "/docs/integrations/observability/langsmith",
    agentMinutes: [3, 8],
  },
  {
    slug: "guides/mcp",
    name: "MCP server tools",
    tagline:
      "Connect MCP servers in the chat route so their tools are available to the model.",
    docs: "/docs/tools/mcp",
    agentMinutes: [5, 15],
  },
  {
    slug: "guides/user-managed-mcp",
    name: "User-managed MCP servers",
    tagline:
      "End users connect, authenticate, and add MCP servers from a dialog in the browser.",
    docs: "/docs/tools/user-managed-mcp",
    agentMinutes: [10, 20],
  },
  {
    slug: "guides/rtl",
    name: "RTL support",
    tagline:
      "Right-to-left layout for Arabic, Hebrew, and Persian chat interfaces.",
    docs: "/docs/rtl",
    agentMinutes: [3, 10],
  },
];

export const GUIDE_PRODUCTS: readonly CatalogItem[] = GUIDES.map(guide);
