import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { agentSetupPrompt, pageSetupPrompt } from "@/lib/agent-setup-prompt";
import { getSkills } from "@/lib/agent-skills";
import { getElement } from "@/components/pages/elements/registry";
import { BLOCKS } from "@/lib/blocks";
import { ELEMENT_INDEX } from "@/lib/catalog/element-index";
import { BASE_URL } from "@/lib/constants";
import { elementProductSlug } from "@/lib/catalog/products/elements";
import { generativeFrame } from "@/lib/catalog/products/generative-frame";
import { safeContentFrame } from "@/lib/catalog/products/safe-content-frame";
import type { LibraryCategoryId, LibraryItem, LibraryMark } from "./catalog";

/** An address on the docs site, which is where every item's own page is. */
const docsUrl = (path: string) => `${BASE_URL}${path}`;

const REPO_TREE = "https://github.com/assistant-ui/assistant-ui/tree/main";

/** The lead clause of a docs description, which a card has room for. */
const lead = (text: string): string => {
  const clause = text.split(" — ")[0]!.split(/\.\s/)[0]!.trim();
  return clause.endsWith(".") ? clause : `${clause}.`;
};

const components: LibraryItem[] = ELEMENT_INDEX.map(
  ([slug, title, registryItem, runtimeWired]) => {
    const element = getElement(slug);
    return {
      id: `components/${slug}`,
      category: "components",
      name: title,
      description:
        element?.description ??
        (runtimeWired
          ? "Wired to the assistant-ui runtime."
          : "Driven by props, with no runtime required."),
      href: docsUrl(`/elements/${slug}`),
      external: true,
      install: { kind: "shadcn", names: [`@assistant-ui/${registryItem}`] },
      prompt: agentSetupPrompt([elementProductSlug(slug)]),
      preview: { kind: "demo", slug },
      ...(element?.wide && { wide: true }),
      ...(element?.connection && { connection: element.connection }),
    };
  },
);

const blocks: LibraryItem[] = BLOCKS.map((block) => ({
  id: `blocks/${block.slug}`,
  category: "blocks",
  name: block.title,
  description: block.description,
  href: docsUrl(`/blocks/${block.slug}`),
  external: true,
  prompt: agentSetupPrompt(
    [],
    `Add the ${block.title} block from ${block.githubLink}`,
  ),
  preview: {
    kind: "image",
    light: docsUrl(block.image.light),
    dark: docsUrl(block.image.dark),
  },
}));

/** Mirrors the template table in content/docs/(getting-started)/cli.mdx. */
const TEMPLATES: readonly (readonly [name: string, description: string])[] = [
  ["default", "Default template with Vercel AI SDK."],
  ["minimal", "Bare-bones starting point."],
  ["cloud", "Cloud-backed persistence starter."],
  ["cloud-clerk", "Cloud-backed starter with Clerk auth."],
  [
    "cloud-harness",
    "A hosted harness with a shared conversation across browsers.",
  ],
  ["langchain", "LangGraph starter with the react-langchain adapter."],
  ["mcp", "MCP tools and MCP Apps renderer starter."],
  ["eve", "Eve agent and Next.js starter."],
  ["vscode", "VS Code extension with a chat webview."],
];

const templateCommand = (name: string) => {
  if (name === "cloud-harness")
    return "npx assistant-ui@latest cloud setup my-app";
  if (name === "default") return "npx assistant-ui@latest create my-app";
  return `npx assistant-ui@latest create my-app -t ${name}`;
};

/** Templates in the repository that `create` does not scaffold. */
const UNSCAFFOLDED_TEMPLATES: readonly (readonly [
  name: string,
  description: string,
])[] = [
  ["nuxt", "Nuxt starter with the Vue primitives and a Nitro streaming route."],
];

const templates: LibraryItem[] = TEMPLATES.map(([name, description]) => ({
  id: `templates/${name}`,
  category: "starters",
  section: "Templates",
  name,
  description,
  href: `${REPO_TREE}/templates/${name}`,
  external: true,
  install: { kind: "command", command: templateCommand(name) },
  prompt: agentSetupPrompt([], `Start from the \`${name}\` template`),
}));

/** Mirrors the example table in content/docs/(getting-started)/cli.mdx. */
const EXAMPLES: readonly (readonly [name: string, description: string])[] = [
  ["with-ai-sdk-v7", "Vercel AI SDK v7 integration."],
  ["with-eve", "Eve agent integration."],
  ["with-artifacts", "HTML artifact rendering with live preview."],
  ["with-langgraph", "LangGraph agent with custom tools."],
  ["with-google-adk", "Google ADK agent integration."],
  ["with-cloud", "Assistant Cloud persistence."],
  ["with-ag-ui", "AG-UI protocol integration."],
  ["with-assistant-transport", "Custom backend via Assistant Transport."],
  [
    "with-resumable-stream",
    "Resumable LLM stream that survives reload mid-response.",
  ],
  [
    "with-chain-of-thought",
    "Chain-of-thought reasoning, tool calls, and source citations.",
  ],
  ["with-external-store", "External message store."],
  ["with-interactables", "AI-driven interactive UI components."],
  ["with-openui", "OpenUI generative UI integration."],
  ["with-custom-thread-list", "Custom thread list UI."],
  ["with-react-hook-form", "React Hook Form integration."],
  ["with-ffmpeg", "FFmpeg video processing tool."],
  ["with-elevenlabs-conversational", "Realtime voice with ElevenLabs."],
  ["with-livekit", "Realtime voice with LiveKit."],
  ["with-elevenlabs-scribe", "ElevenLabs voice transcription."],
  ["with-expo", "Expo and React Native."],
  ["with-react-ink", "Terminal UI chat."],
  ["with-react-router", "React Router v7 integration."],
  ["with-tanstack", "TanStack Start integration."],
];

const examples: LibraryItem[] = EXAMPLES.map(([name, description]) => ({
  id: `examples/${name}`,
  category: "starters",
  section: "Examples",
  name,
  description,
  href: `${REPO_TREE}/examples/${name}`,
  external: true,
  install: {
    kind: "command",
    command: `npx assistant-ui@latest create my-app -e ${name}`,
  },
  prompt: agentSetupPrompt([], `Start from the \`${name}\` example`),
}));

/** Examples in the repository that `create` does not scaffold. */
const REPOSITORY_EXAMPLES: readonly (readonly [
  name: string,
  description: string,
])[] = [
  ["waterfall", "A trace waterfall built on the store and tap packages."],
  ["with-a2a", "A2A (Agent-to-Agent) protocol integration."],
  [
    "with-agent-document-editor",
    "A rich text document that you and an assistant edit together.",
  ],
  [
    "with-article-assistant",
    "A news article with an assistant modal that answers questions about it.",
  ],
  [
    "with-browser-extension",
    "A Chrome extension with the chat in a browser side panel.",
  ],
  ["with-flue", "A chat app on one durable Flue conversation."],
  [
    "with-generative-ui",
    "Interfaces the model composes from a component vocabulary.",
  ],
  ["with-heat-graph", "An activity heatmap built with heat-graph."],
  [
    "with-image-generation",
    "Image generation through a server route, shown with the Image component.",
  ],
  ["with-langchain", "LangChain's useStream as an assistant-ui runtime."],
  [
    "with-mcp",
    "User-managed MCP servers against a local MCP server with OAuth.",
  ],
  [
    "with-nuxt",
    "A Nuxt 4 app with the Vue primitives and a Nitro streaming route.",
  ],
  ["with-opencode", "The OpenCode runtime adapter in a Next.js app."],
  ["with-pi", "A local harness for the Pi coding-agent adapter."],
  [
    "with-pydantic-ai-durable",
    "A Pydantic AI agent over AG-UI whose threads survive a closed browser.",
  ],
  ["with-react-ink-web", "The React Ink terminal chat running in the browser."],
  ["with-solid", "A Solid app on the Solid bindings."],
  ["with-solid-start", "A SolidStart app on the Solid bindings."],
  ["with-store", "A Next.js app demonstrating the store package."],
  ["with-svelte", "A Svelte app on the Svelte bindings."],
  [
    "with-sveltekit",
    "A SvelteKit app with the Svelte builders and a streaming server route.",
  ],
  ["with-tap-runtime", "A runtime written natively on tap and the store."],
  [
    "with-virtualized-thread",
    "A 500-message thread rendered a row at a time with TanStack Virtual.",
  ],
  ["with-vscode", "assistant-ui inside a VS Code extension webview."],
  ["with-vue", "A Vue app on the Vue bindings."],
  [
    "with-webmcp",
    "An app's frontend tools exposed to a WebMCP-capable browser.",
  ],
];

/** A starter that is read on GitHub, since the CLI has no command for it. */
const repositoryStarter = (
  kind: "templates" | "examples",
  section: string,
  [name, description]: readonly [name: string, description: string],
): LibraryItem => {
  const href = `${REPO_TREE}/${kind}/${name}`;
  return {
    id: `${kind}/${name}`,
    category: "starters",
    section,
    name,
    description,
    href,
    external: true,
    prompt: agentSetupPrompt([], `Use ${href} as a reference`),
  };
};

const repositoryStarters: LibraryItem[] = [
  ...UNSCAFFOLDED_TEMPLATES.map((entry) =>
    repositoryStarter("templates", "Templates", entry),
  ),
  ...REPOSITORY_EXAMPLES.map((entry) =>
    repositoryStarter("examples", "More examples", entry),
  ),
];

type DocsEntry = {
  /** The page's path under /docs. */
  path: string;
  /** Replaces a page title that only makes sense in the docs sidebar. */
  name?: string;
  packages?: readonly string[];
  mark?: LibraryMark;
};

const RUNTIMES: readonly DocsEntry[] = [
  {
    path: "runtimes/ai-sdk/overview",
    mark: "vercel",
    name: "Vercel AI SDK",
    packages: ["@assistant-ui/ai-sdk"],
  },
  {
    path: "runtimes/eve/overview",
    name: "Eve",
    packages: ["@assistant-ui/eve"],
  },
  {
    path: "runtimes/langgraph/overview",
    mark: "langgraph",
    name: "LangGraph",
    packages: ["@assistant-ui/react-langgraph"],
  },
  {
    path: "runtimes/langchain",
    mark: "langchain",
    name: "LangChain",
    packages: ["@assistant-ui/react-langchain"],
  },
  {
    path: "runtimes/google-adk/overview",
    mark: "adk",
    name: "Google ADK",
    packages: ["@assistant-ui/react-google-adk"],
  },
  {
    path: "runtimes/a2a/overview",
    mark: "a2a",
    name: "A2A",
    packages: ["@assistant-ui/react-a2a"],
  },
  {
    path: "runtimes/ag-ui/overview",
    mark: "agui",
    name: "AG-UI",
    packages: ["@assistant-ui/react-ag-ui"],
  },
  {
    path: "runtimes/opencode/overview",
    mark: "opencode",
    name: "OpenCode",
    packages: ["@assistant-ui/react-opencode"],
  },
  { path: "runtimes/claude-managed-agents", mark: "claude" },
  { path: "runtimes/custom/local-runtime" },
  { path: "runtimes/custom/external-store" },
  {
    path: "runtimes/custom/data-stream",
    packages: ["@assistant-ui/react-data-stream"],
  },
  { path: "runtimes/custom/assistant-transport" },
];

const INTEGRATIONS: readonly DocsEntry[] = [
  { path: "integrations/frameworks/ai-sdk", mark: "vercel" },
  {
    path: "integrations/frameworks/mastra/overview",
    mark: "mastra",
    name: "Mastra",
  },
  { path: "integrations/frameworks/cloudflare-agents", mark: "cloudflare" },
  { path: "integrations/frameworks/openai-agents" },
  { path: "integrations/frameworks/pydantic-ai" },
  { path: "integrations/gateways", name: "LLM gateways" },
  { path: "integrations/observability/langfuse", mark: "langfuse" },
  { path: "integrations/observability/langsmith", mark: "langchain" },
  { path: "integrations/observability/assistant-cloud" },
  { path: "integrations/auth/clerk" },
  { path: "integrations/auth/better-auth" },
  { path: "integrations/auth/next-auth" },
  { path: "integrations/persistence/custom-adapter" },
  { path: "integrations/attachments/custom-adapter" },
];

const TOOLS: readonly DocsEntry[] = [
  { path: "tools/defining-tools" },
  { path: "tools/backend" },
  { path: "tools/dynamic-tools" },
  { path: "tools/tool-ui" },
  {
    path: "tools/generative-ui",
    packages: ["@assistant-ui/generative-ui"],
  },
  { path: "tools/generative-ui-formats" },
  { path: "tools/generative-ui-slack" },
  { path: "tools/generative-ui-teams" },
  { path: "tools/generative-ui-primitive" },
  { path: "tools/interactables" },
  { path: "tools/a2ui" },
  { path: "tools/openui", packages: ["@openuidev/assistant-ui"] },
  { path: "tools/mcp", mark: "mcp" },
  {
    path: "tools/user-managed-mcp",
    mark: "mcp",
    packages: ["@assistant-ui/react-mcp"],
  },
  { path: "tools/mcp-apps", mark: "mcp" },
  { path: "tools/webmcp", mark: "mcp" },
  { path: "tools/multi-agent" },
];

const UTILITIES: readonly DocsEntry[] = [
  { path: "utilities/heat-graph", packages: ["heat-graph"] },
  { path: "utilities/tw-shimmer", packages: ["tw-shimmer"] },
  { path: "utilities/react-o11y", packages: ["@assistant-ui/react-o11y"] },
];

const DOCS_DIR = join(process.cwd(), "..", "docs", "content", "docs");

/** A page's frontmatter, read from the docs app's content on disk. */
const readDocsPage = (path: string) => {
  const file = [`${path}.mdx`, join(path, "index.mdx")]
    .map((candidate) => join(DOCS_DIR, candidate))
    .find((candidate) => existsSync(candidate));
  if (!file) return undefined;
  const { title, description } = matter(readFileSync(file, "utf8")).data;
  return typeof title === "string"
    ? { title, description: typeof description === "string" ? description : "" }
    : undefined;
};

/** A docs page as a library item; a page that no longer exists yields nothing. */
const fromDocs = (
  category: LibraryCategoryId,
  entries: readonly DocsEntry[],
): LibraryItem[] =>
  entries.flatMap((entry) => {
    const page = readDocsPage(entry.path);
    if (!page) return [];
    const path = `/docs/${entry.path}`;
    return [
      {
        id: `${category}/${entry.path.split("/").slice(1).join("-")}`,
        category,
        name: entry.name ?? page.title,
        description: page.description ? lead(page.description) : "",
        href: docsUrl(path),
        external: true,
        ...(entry.packages && {
          install: { kind: "npm" as const, names: entry.packages },
        }),
        ...(entry.mark && { mark: entry.mark }),
        prompt: pageSetupPrompt(path),
      },
    ];
  });

const PI_PACKAGE = "@assistant-ui/react-pi";

const pi: LibraryItem = {
  id: "runtimes/pi",
  category: "runtimes",
  name: "Pi",
  description: "Pi coding-agent runtime adapter.",
  href: `${REPO_TREE}/packages/react-pi`,
  external: true,
  install: { kind: "npm", names: [PI_PACKAGE] },
  prompt: agentSetupPrompt(
    [],
    `Connect it to the Pi coding agent with \`${PI_PACKAGE}\``,
  ),
};

const DEVTOOLS_PATH = "/docs/devtools";

const devtools: LibraryItem[] = [
  readDocsPage("(getting-started)/devtools"),
].flatMap((page) =>
  page
    ? [
        {
          id: "utilities/devtools",
          category: "utilities" as const,
          name: page.title,
          description: page.description ? lead(page.description) : "",
          href: docsUrl(DEVTOOLS_PATH),
          external: true,
          install: {
            kind: "npm" as const,
            names: ["@assistant-ui/react-devtools"],
          },
          prompt: agentSetupPrompt(["guides/devtools"]),
        },
      ]
    : [],
);

const VARIANTS_PACKAGE = "@assistant-ui/variants";

const variants: LibraryItem = {
  id: "utilities/variants",
  category: "utilities",
  name: "Variants",
  description: "Compare UI variants inline in the real page, then pick one.",
  href: docsUrl("/variants"),
  external: true,
  install: { kind: "npm", names: [VARIANTS_PACKAGE] },
  prompt: agentSetupPrompt(
    [],
    `Add \`${VARIANTS_PACKAGE}\`, following ${REPO_TREE}/packages/variants`,
  ),
};

const frames: LibraryItem[] = [safeContentFrame, generativeFrame].map(
  (item) => ({
    id: `utilities/${item.slug}`,
    category: "utilities",
    name: item.name,
    description: item.tagline,
    href: docsUrl(item.href),
    external: true,
    install: { kind: "npm", names: [item.slug] },
    prompt: agentSetupPrompt([item.slug]),
  }),
);

const skillCommand = (name: string) =>
  `npx skills add assistant-ui/skills --skill ${name}`;

const skills: LibraryItem[] = getSkills().map((skill) => ({
  id: `skills/${skill.name}`,
  category: "skills",
  name: skill.name,
  description: lead(skill.description),
  href: docsUrl("/docs/llm#skills"),
  external: true,
  install: { kind: "command", command: skillCommand(skill.name) },
  prompt: `install the assistant-ui ${skill.name} skill with \`${skillCommand(skill.name)}\``,
}));

export const getLibraryItems = (): LibraryItem[] => [
  ...components,
  ...blocks,
  ...templates,
  ...repositoryStarters.filter((item) => item.section === "Templates"),
  ...examples,
  ...repositoryStarters.filter((item) => item.section !== "Templates"),
  ...fromDocs("runtimes", RUNTIMES),
  pi,
  ...fromDocs("integrations", INTEGRATIONS),
  ...fromDocs("tools", TOOLS),
  ...fromDocs("utilities", UTILITIES),
  ...frames,
  ...devtools,
  variants,
  ...skills,
];
