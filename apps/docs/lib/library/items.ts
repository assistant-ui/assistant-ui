import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { agentSetupPrompt, pageSetupPrompt } from "@/lib/agent-setup-prompt";
import { getSkills } from "@/lib/agent-skills";
import { DESIGN_COMPONENTS } from "@/components/pages/design/registry-meta";
import {
  ELEMENTS,
  elementRegistryName,
} from "@/components/pages/elements/registry";
import { BLOCKS } from "@/lib/blocks";
import { ELEMENT_INDEX } from "@/lib/catalog/element-index";
import { BASE_URL } from "@/lib/constants";
import { elementProductSlug } from "@/lib/catalog/products/elements";
import { generativeFrame } from "@/lib/catalog/products/generative-frame";
import { safeContentFrame } from "@/lib/catalog/products/safe-content-frame";
import type {
  ComponentSection,
  LibraryCategoryId,
  LibraryItem,
  LibraryMark,
} from "./catalog";
import {
  LIBRARY_THEMES,
  themeApplyCommand,
  themeBuilderHref,
  themeOverridesCss,
  themeSummary,
} from "./themes";

/** An address on the docs site, which is where every item's own page is. */
const docsUrl = (path: string) => `${BASE_URL}${path}`;

const REPO_TREE = "https://github.com/assistant-ui/assistant-ui/tree/main";

/** The lead clause of a docs description, which a card has room for. */
const lead = (text: string): string => {
  const clause = text.split(" — ")[0]!.split(/\.\s/)[0]!.trim();
  return clause.endsWith(".") ? clause : `${clause}.`;
};

const ELEMENTS_SECTION: ComponentSection = "Elements";
const AUI_CONNECTED: ComponentSection = "AUI connected";
const UI: ComponentSection = "UI";
const PRIMITIVES: ComponentSection = "Primitives";

const SETUP_ELEMENTS = new Set(ELEMENT_INDEX.map(([slug]) => slug));

const elements: LibraryItem[] = ELEMENTS.map((element) => {
  const { slug } = element;
  const path = `/elements/${slug}`;
  return {
    id: `components/${slug}`,
    category: "components",
    // The docs catalog groups its runtime-wired elements under this same label.
    section:
      element.section === AUI_CONNECTED ? AUI_CONNECTED : ELEMENTS_SECTION,
    name: element.title,
    description: element.description,
    href: docsUrl(path),
    external: true,
    install: element.generative
      ? { kind: "npm", names: ["@assistant-ui/generative-ui", "zod"] }
      : {
          kind: "shadcn",
          names: [`@assistant-ui/${elementRegistryName(element)}`],
        },
    // The setup command knows the elements in its index; the rest are set up
    // from their page.
    prompt: SETUP_ELEMENTS.has(slug)
      ? agentSetupPrompt([elementProductSlug(slug)])
      : pageSetupPrompt(path),
    preview: { kind: "demo", slug },
    ...(element.wide && { wide: true }),
    ...(element.connection && { connection: element.connection }),
  };
});

const DESIGN_DIR = join(process.cwd(), "content", "design", "components");

/** The registry items a design component's page installs; none when the page gives its source to copy. */
const designRegistryItems = (slug: string): string[] => {
  const file = join(DESIGN_DIR, `${slug}.mdx`);
  const content = readFileSync(file, "utf8");
  const names = /<InstallCommand shadcn=\{\[([^\]]*)\]\}/.exec(content)?.[1];
  const items = [...(names ?? "").matchAll(/"([^"]+)"/g)].map(
    ([, name]) => `@assistant-ui/${name}`,
  );
  if (content.includes("<InstallCommand") && items.length === 0) {
    throw new Error(`No registry items found in design page: ${file}`);
  }
  return items;
};

const ui: LibraryItem[] = DESIGN_COMPONENTS.map(
  ({ slug, name, description }) => {
    const href = docsUrl(`/design/components/${slug}`);
    const names = designRegistryItems(slug);
    return {
      id: `ui/${slug}`,
      category: "components",
      section: UI,
      name,
      description,
      href,
      external: true,
      ...(names.length > 0 && { install: { kind: "shadcn" as const, names } }),
      prompt: agentSetupPrompt([], `Add the ${name} component from ${href}`),
      preview: { kind: "specimen", slug },
    };
  },
);

/** The pages of content/docs/primitives, in the order its sidebar lists them. */
const PRIMITIVE_PAGES = [
  "composer",
  "thread",
  "message",
  "action-bar",
  "branch-picker",
  "thread-list",
  "assistant-modal",
  "attachment",
  "suggestion",
  "selection-toolbar",
  "error",
  "chain-of-thought",
] as const;

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
    light: block.image.light,
    dark: block.image.dark,
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

const DOCS_DIR = join(process.cwd(), "content", "docs");

/** A page's frontmatter, read from the docs app's content on disk. */
const readDocsPage = (path: string) => {
  const file = [`${path}.mdx`, join(path, "index.mdx")]
    .map((candidate) => join(DOCS_DIR, candidate))
    .find((candidate) => existsSync(candidate));
  if (!file) throw new Error(`Docs page not found: ${path}`);
  const { title, description } = matter(readFileSync(file, "utf8")).data;
  if (typeof title !== "string") {
    throw new Error(`Docs page is missing a title: ${file}`);
  }
  return {
    title,
    description: typeof description === "string" ? description : "",
  };
};

const fromDocs = (
  category: LibraryCategoryId,
  entries: readonly DocsEntry[],
): LibraryItem[] =>
  entries.map((entry) => {
    const page = readDocsPage(entry.path);
    const path = `/docs/${entry.path}`;
    return {
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
    };
  });

const primitives: LibraryItem[] = PRIMITIVE_PAGES.map((slug) => {
  const page = readDocsPage(`primitives/${slug}`);
  const path = `/docs/primitives/${slug}`;
  return {
    id: `primitives/${slug}`,
    category: "components" as const,
    section: PRIMITIVES,
    name: page.title,
    description: page.description ? lead(page.description) : "",
    href: docsUrl(path),
    external: true,
    install: { kind: "npm" as const, names: ["@assistant-ui/react"] },
    prompt: pageSetupPrompt(path),
    preview: { kind: "sample" as const, slug },
  };
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
].map((page) => ({
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
}));

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

const SKILL_AGENTS: readonly (readonly [
  name: string,
  slug: string,
  directory: string,
])[] = [
  ["AdaL", "adal", ".adal/skills"],
  ["AiderDesk", "aider-desk", ".aider-desk/skills"],
  ["Amp", "amp", ".agents/skills"],
  ["Antigravity", "antigravity", ".agents/skills"],
  ["Antigravity CLI", "antigravity-cli", ".agents/skills"],
  ["AstrBot", "astrbot", "data/skills"],
  ["Augment", "augment", ".augment/skills"],
  ["Autohand Code CLI", "autohand-code", ".autohand/skills"],
  ["Claude Code", "claude-code", ".claude/skills"],
  ["Cline", "cline", ".agents/skills"],
  ["Code Studio", "codestudio", ".codestudio/skills"],
  ["CodeArts Agent", "codearts-agent", ".codeartsdoer/skills"],
  ["CodeBuddy", "codebuddy", ".codebuddy/skills"],
  ["Codemaker", "codemaker", ".codemaker/skills"],
  ["Codex", "codex", ".agents/skills"],
  ["Command Code", "command-code", ".commandcode/skills"],
  ["Continue", "continue", ".continue/skills"],
  ["Cortex Code", "cortex", ".cortex/skills"],
  ["Crush", "crush", ".crush/skills"],
  ["Cursor", "cursor", ".agents/skills"],
  ["Deep Agents", "deepagents", ".agents/skills"],
  ["Devin for Terminal", "devin", ".devin/skills"],
  ["Dexto", "dexto", ".agents/skills"],
  ["Droid", "droid", ".agents/skills"],
  ["Eve", "eve", "agent/skills"],
  ["Firebender", "firebender", ".agents/skills"],
  ["ForgeCode", "forgecode", ".forge/skills"],
  ["fx", "fx", ".agents/skills"],
  ["Gemini CLI", "gemini-cli", ".agents/skills"],
  ["GitHub Copilot", "github-copilot", ".agents/skills"],
  ["Goose", "goose", ".goose/skills"],
  ["Grok Build", "grok", ".grok/skills"],
  ["Hermes Agent", "hermes-agent", ".hermes/skills"],
  ["IBM Bob", "bob", ".bob/skills"],
  ["iFlow CLI", "iflow-cli", ".iflow/skills"],
  ["inference.sh", "inference-sh", ".inferencesh/skills"],
  ["Jazz", "jazz", ".jazz/skills"],
  ["Junie", "junie", ".junie/skills"],
  ["Kilo Code", "kilo", ".agents/skills"],
  ["Kimchi", "kimchi", ".kimchi/skills"],
  ["Kimi Code CLI", "kimi-code-cli", ".agents/skills"],
  ["Kiro CLI", "kiro-cli", ".kiro/skills"],
  ["Kode", "kode", ".kode/skills"],
  ["Lingma", "lingma", ".lingma/skills"],
  ["Loaf", "loaf", ".agents/skills"],
  ["MCPJam", "mcpjam", ".mcpjam/skills"],
  ["MiniMax Code", "minimax-code", ".minimax/skills"],
  ["Mistral Vibe", "mistral-vibe", ".vibe/skills"],
  ["Moxby", "moxby", ".moxby/skills"],
  ["Mux", "mux", ".mux/skills"],
  ["Neovate", "neovate", ".neovate/skills"],
  ["Ona", "ona", ".ona/skills"],
  ["OpenClaw", "openclaw", "skills"],
  ["OpenCode", "opencode", ".agents/skills"],
  ["OpenHands", "openhands", ".openhands/skills"],
  ["Pi", "pi", ".agents/skills"],
  ["Pochi", "pochi", ".pochi/skills"],
  ["Posit Assistant", "posit-assistant", ".posit/assistant/skills"],
  ["PromptScript", "promptscript", ".agents/skills"],
  ["Qoder", "qoder", ".qoder/skills"],
  ["Qoder CN", "qoder-cn", ".qoder/skills"],
  ["Qwen Code", "qwen-code", ".qwen/skills"],
  ["Reasonix", "reasonix", ".reasonix/skills"],
  ["Replit", "replit", ".agents/skills"],
  ["Roo Code", "roo", ".roo/skills"],
  ["Rovo Dev", "rovodev", ".rovodev/skills"],
  ["Sarvam Code", "sarvam-code", ".agents/skills"],
  ["Tabnine CLI", "tabnine-cli", ".tabnine/agent/skills"],
  ["Terramind", "terramind", ".terramind/skills"],
  ["Tinycloud", "tinycloud", ".tinycloud/skills"],
  ["Trae", "trae", ".trae/skills"],
  ["Trae CN", "trae-cn", ".trae/skills"],
  ["Universal", "universal", ".agents/skills"],
  ["Warp", "warp", ".agents/skills"],
  ["Windsurf", "windsurf", ".windsurf/skills"],
  ["ZCode", "zcode", ".zcode/skills"],
  ["Zed", "zed", ".agents/skills"],
  ["Zencoder", "zencoder", ".zencoder/skills"],
  ["Zenflow", "zenflow", ".zencoder/skills"],
];

const SKILL_AGENTS_DOCS =
  "https://github.com/vercel-labs/skills/blob/main/docs/agents.md";

const agentCommand = (slug: string) =>
  `npx skills add assistant-ui/skills -a ${slug}`;

const skillAgents: LibraryItem[] = SKILL_AGENTS.map(
  ([name, slug, directory]) => {
    const command = agentCommand(slug);
    return {
      id: `skills/${slug}`,
      category: "skills",
      section: "Agents",
      name,
      description: `Installs into ${directory}.`,
      href: SKILL_AGENTS_DOCS,
      external: true,
      install: { kind: "command", command },
      prompt: `install the assistant-ui skills into ${name} with \`${command}\``,
    };
  },
);

const themes: LibraryItem[] = LIBRARY_THEMES.map((theme) => {
  const command = themeApplyCommand(theme.preset);
  const css = theme.overrides && themeOverridesCss(theme.overrides);
  return {
    id: `themes/${theme.slug}`,
    category: "themes",
    section: theme.section,
    name: theme.name,
    description: themeSummary(theme.settings),
    // A theme with a code has a page on shadcn's builder; the rest open in ours.
    ...(theme.code
      ? {
          href: `https://ui.shadcn.com/create?preset=${theme.code}`,
          external: true,
        }
      : { href: themeBuilderHref(theme.slug), external: false }),
    install: { kind: "command", command },
    prompt: agentSetupPrompt(
      [],
      css
        ? `Apply the ${theme.name} theme with \`${command}\`, then add this to the global stylesheet: ${css}`
        : `Apply the ${theme.name} theme with \`${command}\``,
    ),
    ...(css && { css }),
    preview: { kind: "theme", slug: theme.slug },
  };
});

export const getLibraryItems = (): LibraryItem[] => [
  ...elements,
  ...ui,
  ...primitives,
  ...blocks,
  ...themes,
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
  ...skillAgents,
];
