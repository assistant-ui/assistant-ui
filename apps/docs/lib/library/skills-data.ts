export const SKILLS_REPO = "assistant-ui/skills";

export const SKILLS_COMMAND = `npx skills add ${SKILLS_REPO}`;
export const SKILLS_PROMPT = `Install the assistant-ui agent skills with \`${SKILLS_COMMAND}\``;
export const SKILLS_REPO_HREF = `https://github.com/${SKILLS_REPO}`;

export type SkillGroupId = "start" | "interface" | "runtime" | "platforms";

export type SkillGroup = {
  id: SkillGroupId;
  title: string;
  description: string;
};

export const SKILL_GROUPS: readonly SkillGroup[] = [
  {
    id: "start",
    title: "Start",
    description: "Find your way around, install, and upgrade.",
  },
  {
    id: "interface",
    title: "Interface",
    description: "The chat surface and what renders inside it.",
  },
  {
    id: "runtime",
    title: "Runtime and backend",
    description: "State, tools, streaming, and hosted services.",
  },
  {
    id: "platforms",
    title: "Platforms",
    description: "Chat outside the browser.",
  },
];

export type SkillReference = {
  file: string;
  /** Where the file is read from: the skills repo, at the commit this site pins. */
  href: string;
  /** The file's place inside the skill's folder, such as `references/ai-sdk.md`. */
  path: string;
};

/** What the skills page shows for one skill; the full SKILL.md is fetched from `rawHref` on demand. */
export type LibrarySkill = {
  name: string;
  title: string;
  /** One line for a card or a row. */
  summary: string;
  /** The description an agent matches a task against; search reads it. */
  description: string;
  group: SkillGroupId;
  sections: readonly string[];
  references: readonly SkillReference[];
  command: string;
  /** What to tell a coding agent to install this skill. */
  prompt: string;
  slash: string;
  /** The site's copy of SKILL.md, with its links made absolute. */
  rawHref: string;
  /** SKILL.md as the skills repo holds it, for a download. */
  sourceFileHref: string;
  sourceHref: string;
};

export const matchesSkill = (skill: LibrarySkill, query: string) =>
  [
    skill.name,
    skill.title,
    skill.summary,
    skill.description,
    ...skill.sections,
  ].some((text) => text.toLowerCase().includes(query));

/** Every skill, in the order the page lists them: by group, then as the skills repo orders them. */
export const LIBRARY_SKILLS: readonly LibrarySkill[] = [
  {
    name: "assistant-ui",
    title: "assistant-ui",
    summary: "The overview: architecture, packages, and which skill to use.",
    description:
      "Overview and router for assistant-ui, the React library for building AI chat interfaces from composable primitives and a styled elements catalog. Use for high-level, cross-cutting, or architecture questions: choosing packages, picking a runtime, or understanding the layers (elements, primitives, the aui client with AuiConfig and AuiProvider, the runtime, adapters) and the message model. Covers `@assistant-ui/react` 0.15.x, `@assistant-ui/ai-sdk` for AI SDK v7 (`useChatRuntime`), `@assistant-ui/core`, `@assistant-ui/store`, `assistant-stream`, `assistant-cloud`, the LangGraph, LangChain, Google ADK, A2A, AG-UI, Eve, OpenCode, and Pi adapters, the `@assistant-ui/react-native` and `@assistant-ui/react-ink` bindings, and the `useAui`, `useAuiState`, and `useAuiEvent` hooks. For a specific area route to a focused sibling instead: setup, elements, primitives, runtime, tools, generative-ui, streaming, cloud, thread-list, copilots, markdown, react-mcp, observability, react-native, ink, or update.",
    group: "start",
    sections: [
      "When to Use",
      "Architecture",
      "Pick a Runtime",
      "Core Packages",
      "Quick Start",
      "State Access",
      "Providing Scopes",
    ],
    references: [
      {
        file: "architecture.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/assistant-ui/references/architecture.md",
        path: "references/architecture.md",
      },
      {
        file: "packages.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/assistant-ui/references/packages.md",
        path: "references/packages.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill assistant-ui",
    prompt:
      "Install the assistant-ui `assistant-ui` skill with `npx skills add assistant-ui/skills --skill assistant-ui`",
    slash: "/assistant-ui",
    rawHref: "/.well-known/agent-skills/assistant-ui/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/assistant-ui/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/assistant-ui",
  },
  {
    name: "setup",
    title: "Setup",
    summary: "Install with the CLI and pick the runtime for your backend.",
    description:
      "Installs and configures assistant-ui with the `assistant-ui` CLI (`create`, `init`, `add`, `update`, `upgrade`, `codemod`, `doctor`, `info`, `mcp`, `agent`) and picks the runtime adapter for a backend. Use for first-time install (`npx assistant-ui@latest create`, templates, `--example` scaffolds), adding to an existing Next.js app (`init`), or keeping an install current. Covers the runtime hook per backend: `useChatRuntime` (AI SDK v7), `useLangGraphRuntime`, `useStreamRuntime` (LangChain), `useAdkRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useEveAgentRuntime`, `useOpenCodeRuntime`, `useLocalRuntime`, `useExternalStoreRuntime`, `useDataStreamRuntime`, and `useAssistantTransportRuntime`, plus wiring guides for Mastra, Cloudflare Agents, Claude Managed Agents, LLM gateways, and Electron, the Expo (`--native`) and React Ink (`--ink`) scaffolds, and the hosted MCP docs server. Once a runtime exists, use elements for the styled Thread, runtime for hooks and adapters, and update for a deep migration.",
    group: "start",
    sections: [
      "CLI decision flow",
      "create",
      "init",
      "add",
      "Keeping an install current",
      "Pick a runtime",
      "Platform targets",
      "Common Gotchas",
    ],
    references: [
      {
        file: "ai-sdk.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/ai-sdk.md",
        path: "references/ai-sdk.md",
      },
      {
        file: "ai-sdk-legacy.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/ai-sdk-legacy.md",
        path: "references/ai-sdk-legacy.md",
      },
      {
        file: "langgraph.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/langgraph.md",
        path: "references/langgraph.md",
      },
      {
        file: "langchain.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/langchain.md",
        path: "references/langchain.md",
      },
      {
        file: "google-adk.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/google-adk.md",
        path: "references/google-adk.md",
      },
      {
        file: "a2a.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/a2a.md",
        path: "references/a2a.md",
      },
      {
        file: "ag-ui.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/ag-ui.md",
        path: "references/ag-ui.md",
      },
      {
        file: "eve.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/eve.md",
        path: "references/eve.md",
      },
      {
        file: "opencode.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/opencode.md",
        path: "references/opencode.md",
      },
      {
        file: "claude-managed-agents.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/claude-managed-agents.md",
        path: "references/claude-managed-agents.md",
      },
      {
        file: "custom-backend.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/custom-backend.md",
        path: "references/custom-backend.md",
      },
      {
        file: "tanstack.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/tanstack.md",
        path: "references/tanstack.md",
      },
      {
        file: "mastra.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/mastra.md",
        path: "references/mastra.md",
      },
      {
        file: "cloudflare-agents.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/cloudflare-agents.md",
        path: "references/cloudflare-agents.md",
      },
      {
        file: "providers.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/providers.md",
        path: "references/providers.md",
      },
      {
        file: "devtools.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/references/devtools.md",
        path: "references/devtools.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill setup",
    prompt:
      "Install the assistant-ui `setup` skill with `npx skills add assistant-ui/skills --skill setup`",
    slash: "/setup",
    rawHref: "/.well-known/agent-skills/setup/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/setup",
  },
  {
    name: "update",
    title: "Update",
    summary: "Upgrade assistant-ui and the AI SDK, and apply migrations.",
    description:
      "Upgrades an existing assistant-ui application and applies the migrations needed to reach the current AI SDK v7 and assistant-ui 0.15.x lines. Use when updating, bumping, or migrating @assistant-ui/react, @assistant-ui/ai-sdk, the older @assistant-ui/react-ai-sdk alias, ai, or @ai-sdk/react, or when an upgrade exposes removed hooks, scope accessor calls, provider configuration, registry paths, event names, legacy interactables, or tool registrations. Start here for an existing project, post-update type failures, package compatibility, CLI codemods, and version-specific migration order. For a first install or a new project use setup; for authoring a runtime without an upgrade use runtime.",
    group: "start",
    sections: [
      "Detect the installed lines",
      "Choose the migration set",
      "Migration order",
      "Run the CLI",
      "0.15.x follow-ups",
      "Verify",
      "Common Gotchas",
    ],
    references: [
      {
        file: "ai-sdk.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/update/references/ai-sdk.md",
        path: "references/ai-sdk.md",
      },
      {
        file: "assistant-ui.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/update/references/assistant-ui.md",
        path: "references/assistant-ui.md",
      },
      {
        file: "breaking-changes.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/update/references/breaking-changes.md",
        path: "references/breaking-changes.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill update",
    prompt:
      "Install the assistant-ui `update` skill with `npx skills add assistant-ui/skills --skill update`",
    slash: "/update",
    rawHref: "/.well-known/agent-skills/update/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/update/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/update",
  },
  {
    name: "elements",
    title: "Elements",
    summary: "Add and customize the styled components from the registry.",
    description:
      "Installs and customizes assistant-ui elements, the styled shadcn-style component catalog served from the r.assistant-ui.com registry through `npx assistant-ui@latest add <item>`. Use when adding a prebuilt chat surface or widget (Thread, ThreadList, AssistantModal, AssistantSidebar, ToolFallback, ToolGroup, MarkdownText, Reasoning, Sources, Attachment, ModelSelector, Voice orb, McpConfig) or one of the 120 standalone elements (approval card, agent plan, code diff, data table, chart, and so on), choosing between runtime-connected `<name>.aui.tsx` files and props-driven standalone files, overriding Thread slots through the `components` prop, editing the copied source under `components/assistant-ui/elements/`, or picking the Radix versus Base UI flavor in `components.json`. Route here when an import from `@/components/assistant-ui/...` fails, an element renders unstyled, or the CLI installs the wrong flavor. For unstyled building blocks use primitives; for the CLI scaffold itself use setup.",
    group: "interface",
    sections: [
      "Two kinds of element",
      "Install",
      "Use a runtime-connected element",
      "Use a standalone element",
      "Shared surface tokens",
      "Common Gotchas",
    ],
    references: [
      {
        file: "catalog.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/elements/references/catalog.md",
        path: "references/catalog.md",
      },
      {
        file: "aui-elements.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/elements/references/aui-elements.md",
        path: "references/aui-elements.md",
      },
      {
        file: "standalone-elements.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/elements/references/standalone-elements.md",
        path: "references/standalone-elements.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill elements",
    prompt:
      "Install the assistant-ui `elements` skill with `npx skills add assistant-ui/skills --skill elements`",
    slash: "/elements",
    rawHref: "/.well-known/agent-skills/elements/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/elements/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/elements",
  },
  {
    name: "primitives",
    title: "Primitives",
    summary: "Build your own chat UI from unstyled parts.",
    description:
      "Builds and customizes assistant-ui chat UI from composable, unstyled @assistant-ui/react primitives: ThreadPrimitive, ComposerPrimitive (with Unstable_TriggerPopover for mentions and slash commands), MessagePrimitive and MessagePartPrimitive, ActionBarPrimitive, BranchPickerPrimitive, AttachmentPrimitive, ErrorPrimitive, AssistantModalPrimitive, ChainOfThoughtPrimitive, SelectionToolbarPrimitive, SuggestionPrimitive, QueueItemPrimitive, and the ThreadList primitives. Use when assembling or styling a custom Thread, Composer, message list, action bar, branch picker, or suggestion grid; wiring composer input, dictation, quoting, or attachments; or handling editing, branching, virtualization, scrolling, or chain of thought UI. Covers MessagePrimitive.Parts render functions per part type, groupPartByType, AuiIf in selector form, and the unstyled gotchas (AssistantRuntimeProvider, className). For prebuilt UI use setup, for the styled catalog use elements, for multi-thread sidebars use thread-list.",
    group: "interface",
    sections: [
      "Import",
      "Primitive parts",
      "Conditional rendering with AuiIf",
      "Custom thread example",
      "Branch picker",
      "Common Gotchas",
    ],
    references: [
      {
        file: "thread.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/thread.md",
        path: "references/thread.md",
      },
      {
        file: "composer.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/composer.md",
        path: "references/composer.md",
      },
      {
        file: "message.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/message.md",
        path: "references/message.md",
      },
      {
        file: "action-bar.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/action-bar.md",
        path: "references/action-bar.md",
      },
      {
        file: "part-grouping.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/part-grouping.md",
        path: "references/part-grouping.md",
      },
      {
        file: "mentions.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/mentions.md",
        path: "references/mentions.md",
      },
      {
        file: "composer-input.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/composer-input.md",
        path: "references/composer-input.md",
      },
      {
        file: "messages.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/messages.md",
        path: "references/messages.md",
      },
      {
        file: "suggestions.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/references/suggestions.md",
        path: "references/suggestions.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill primitives",
    prompt:
      "Install the assistant-ui `primitives` skill with `npx skills add assistant-ui/skills --skill primitives`",
    slash: "/primitives",
    rawHref: "/.well-known/agent-skills/primitives/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/primitives",
  },
  {
    name: "generative-ui",
    title: "Generative UI",
    summary: "Let the model compose UI from your components.",
    description:
      "Lets the model compose interfaces at runtime from a component vocabulary instead of one hand-written component per tool, and covers every generative UI pattern in the framework. Use for the model-driven present tool: JSONGenerativeUI, defaultGenerativeUILibrary, and present({ display }) from @assistant-ui/generative-ui/react, registered through AuiConfig({ tools: Tools({ toolkit }) }). Also covers the backend-driven MessagePrimitive.GenerativeUI primitive and its component allowlist, the Slack Block Kit and Microsoft Teams Adaptive Card renderers and their action decoders, A2UI surfaces over AG-UI, and the third-party OpenUI integration. Route here when the model should design its own layout rather than fill one you wrote, when an unknown _type or component name throws or silently renders nothing, or when a generative UI tree needs to post to Slack or Teams or paint an A2UI surface. For a widget tied to one tool call you already know about, use tool-ui in the tools skill instead.",
    group: "interface",
    sections: [
      "Which generative UI pattern?",
      "Quick start",
      "Style it",
      "Beyond present",
      "Common Gotchas",
    ],
    references: [
      {
        file: "vocabulary.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/generative-ui/references/vocabulary.md",
        path: "references/vocabulary.md",
      },
      {
        file: "actions.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/generative-ui/references/actions.md",
        path: "references/actions.md",
      },
      {
        file: "renderers.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/generative-ui/references/renderers.md",
        path: "references/renderers.md",
      },
      {
        file: "a2ui-openui.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/generative-ui/references/a2ui-openui.md",
        path: "references/a2ui-openui.md",
      },
      {
        file: "tokens.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/generative-ui/references/tokens.md",
        path: "references/tokens.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill generative-ui",
    prompt:
      "Install the assistant-ui `generative-ui` skill with `npx skills add assistant-ui/skills --skill generative-ui`",
    slash: "/generative-ui",
    rawHref: "/.well-known/agent-skills/generative-ui/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/generative-ui/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/generative-ui",
  },
  {
    name: "thread-list",
    title: "Thread List",
    summary: "Add and manage multiple conversations.",
    description:
      "Builds and customizes multiple conversation lists in assistant-ui with the runtime connected ThreadList and ThreadListSidebar elements, ThreadListPrimitive, ThreadListItemPrimitive, ThreadListItemMorePrimitive, useAui, useAuiState, and threads.selectionChanged. Use when adding a conversation sidebar, switching, archiving, renaming, deleting, searching, grouping, paginating, or persisting threads, or when thread state is stale after authentication. Covers AssistantCloud, RemoteThreadListRuntime, and ExternalStoreThreadListAdapter. Use runtime for the active conversation runtime, cloud for managed authentication and persistence, and elements for registry installation and styling.",
    group: "interface",
    sections: [
      "Quick Start",
      "Thread Operations",
      "Compose a Custom List",
      "Choose a Multi Conversation Path",
      "Observe Selection",
      "Common Gotchas",
    ],
    references: [
      {
        file: "management.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/thread-list/references/management.md",
        path: "references/management.md",
      },
      {
        file: "custom-ui.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/thread-list/references/custom-ui.md",
        path: "references/custom-ui.md",
      },
      {
        file: "remote-adapter.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/thread-list/references/remote-adapter.md",
        path: "references/remote-adapter.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill thread-list",
    prompt:
      "Install the assistant-ui `thread-list` skill with `npx skills add assistant-ui/skills --skill thread-list`",
    slash: "/thread-list",
    rawHref: "/.well-known/agent-skills/thread-list/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/thread-list/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/thread-list",
  },
  {
    name: "markdown",
    title: "Markdown",
    summary: "Render messages as markdown with code, math, and diagrams.",
    description:
      "Renders assistant message text as markdown in assistant-ui. Use when wiring MarkdownTextPrimitive or the markdown-text element into MessagePrimitive.Parts, installing Shiki or Prism highlighting, adding KaTeX math or Mermaid diagrams, normalizing model-produced math delimiters, or choosing StreamdownTextPrimitive for block-aware streaming with optional code, math, Mermaid, and CJK plugins. Covers defer and smooth parsing behavior, code block overrides, and stream completion. For the surrounding unstyled message composition use primitives, and for installing or editing a styled renderer use elements.",
    group: "interface",
    sections: [
      "Choose the renderer",
      "Install and wire MarkdownText",
      "Customize the primitive",
      "Highlight fenced code",
      "Render math and diagrams",
      "Use Streamdown instead",
      "Common Gotchas",
    ],
    references: [
      {
        file: "markdown-text.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/markdown/references/markdown-text.md",
        path: "references/markdown-text.md",
      },
      {
        file: "syntax-highlighting.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/markdown/references/syntax-highlighting.md",
        path: "references/syntax-highlighting.md",
      },
      {
        file: "latex-mermaid.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/markdown/references/latex-mermaid.md",
        path: "references/latex-mermaid.md",
      },
      {
        file: "streamdown.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/markdown/references/streamdown.md",
        path: "references/streamdown.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill markdown",
    prompt:
      "Install the assistant-ui `markdown` skill with `npx skills add assistant-ui/skills --skill markdown`",
    slash: "/markdown",
    rawHref: "/.well-known/agent-skills/markdown/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/markdown/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/markdown",
  },
  {
    name: "runtime",
    title: "Runtime",
    summary: "Create a runtime and read or change chat state.",
    description:
      "Guide to the assistant-ui runtime system, the state and action layer behind every chat surface. Use when creating a runtime (useLocalRuntime with a ChatModelAdapter, useExternalStoreRuntime for Redux or Zustand backed stores, useRemoteThreadListRuntime, useCloudThreadListRuntime, useAssistantTransportRuntime), wiring AssistantRuntimeProvider, or reading and mutating thread, message, composer, and attachment state. Covers useAui, useAuiState, and useAuiEvent with the stable selector rule, the scope accessors (aui.thread, aui.message, aui.composer, and siblings), the AuiConfig plus AuiProvider grammar, RuntimeCapabilities, and the attachment, speech, dictation, feedback, suggestion, and history adapters. Route here for a provider error ('Cannot read property of undefined'), a removed v0.12 hook import, an infinite re-render from an object literal selector, or state not updating. For multi-thread list UI use thread-list instead; for toolkit definitions and tool call UI use tools instead.",
    group: "runtime",
    sections: [
      "Runtime hierarchy",
      "useAui, useAuiState, useAuiEvent",
      "Scope accessors are properties",
      "AuiConfig and AuiProvider",
      "Thread and message operations",
      "Events",
      "Optional scopes",
      "Capabilities",
      "Common Gotchas",
    ],
    references: [
      {
        file: "local-runtime.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime/references/local-runtime.md",
        path: "references/local-runtime.md",
      },
      {
        file: "external-store.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime/references/external-store.md",
        path: "references/external-store.md",
      },
      {
        file: "state-hooks.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime/references/state-hooks.md",
        path: "references/state-hooks.md",
      },
      {
        file: "types.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime/references/types.md",
        path: "references/types.md",
      },
      {
        file: "adapters.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime/references/adapters.md",
        path: "references/adapters.md",
      },
      {
        file: "voice.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime/references/voice.md",
        path: "references/voice.md",
      },
      {
        file: "runtime-concepts.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime/references/runtime-concepts.md",
        path: "references/runtime-concepts.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill runtime",
    prompt:
      "Install the assistant-ui `runtime` skill with `npx skills add assistant-ui/skills --skill runtime`",
    slash: "/runtime",
    rawHref: "/.well-known/agent-skills/runtime/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/runtime",
  },
  {
    name: "tools",
    title: "Tools",
    summary: "Define tools the model can call and render their results.",
    description:
      'Defines model-callable tools and renders their calls in assistant-ui. The authoring model: a "use generative" file whose default export is defineToolkit({...}), compiled by withAui from @assistant-ui/next, aui() from @assistant-ui/vite, or withAui from @assistant-ui/metro, mounted with AuiConfig({ tools: Tools({ toolkit }) }), and exposed to the model with new AISDKToolkit({ toolkit }).tools({ frontend }). Covers the tool kinds (backend, "use client" frontend, humanTool(), providerTool(), externalTool(), stubTool(), defineMcpToolkit()), render and display, ToolCallMessagePartProps, approval gates, MCP servers, MCP Apps, WebMCP, and sub-agent messages. Reach for it when a tool is never called, a tool UI does not render, a frontend result never reaches the model, humanTool() throws at runtime, or an approval gate cannot be answered. For model-composed UI use generative-ui, for MCP servers users add in the browser use react-mcp, and for the styled ToolFallback and ToolGroup use elements.',
    group: "runtime",
    sections: [
      "The authoring model",
      "Tool kinds",
      "Rendering a tool call",
      "Approval gates",
      "Human tools",
      "Common Gotchas",
    ],
    references: [
      {
        file: "toolkits.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/references/toolkits.md",
        path: "references/toolkits.md",
      },
      {
        file: "tool-ui.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/references/tool-ui.md",
        path: "references/tool-ui.md",
      },
      {
        file: "human-in-loop.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/references/human-in-loop.md",
        path: "references/human-in-loop.md",
      },
      {
        file: "mcp-server.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/references/mcp-server.md",
        path: "references/mcp-server.md",
      },
      {
        file: "mcp-apps.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/references/mcp-apps.md",
        path: "references/mcp-apps.md",
      },
      {
        file: "webmcp.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/references/webmcp.md",
        path: "references/webmcp.md",
      },
      {
        file: "multi-agent.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/references/multi-agent.md",
        path: "references/multi-agent.md",
      },
      {
        file: "legacy-component-apis.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/references/legacy-component-apis.md",
        path: "references/legacy-component-apis.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill tools",
    prompt:
      "Install the assistant-ui `tools` skill with `npx skills add assistant-ui/skills --skill tools`",
    slash: "/tools",
    rawHref: "/.well-known/agent-skills/tools/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/tools",
  },
  {
    name: "streaming",
    title: "Streaming",
    summary: "Build a custom streaming backend with assistant-stream.",
    description:
      "Streaming wire protocols and backend helpers for assistant-ui, built on the assistant-stream package. Use when building a custom streaming endpoint outside the Vercel AI SDK with createAssistantStreamResponse, createAssistantStream, or createAssistantStreamController; choosing between the Data Stream protocol (useDataStreamRuntime, DataStreamEncoder, DataStreamDecoder) and the Assistant Transport protocol (AssistantTransportEncoder, AssistantTransportDecoder); decoding a response with AssistantStream.fromResponse, UIMessageStreamDecoder, or PlainTextDecoder; or wiring resumable streams through assistant-stream/resumable with in-memory, Redis, or ioredis stores. Route here for wire level symptoms: an unexpected part-start or text-delta shape, a tool call that never settles, a part that silently drops, a Content-Type mismatch, or a reload that cannot resume a response. For runtime hooks use runtime; for AI SDK route handlers without a custom protocol use setup; for cloud persistence use cloud.",
    group: "runtime",
    sections: [
      "When to use it",
      "Installation",
      "Build a custom streaming response",
      "AssistantStreamController",
      "Stream events and part types",
      "Common Gotchas",
    ],
    references: [
      {
        file: "data-stream.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/streaming/references/data-stream.md",
        path: "references/data-stream.md",
      },
      {
        file: "assistant-transport.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/streaming/references/assistant-transport.md",
        path: "references/assistant-transport.md",
      },
      {
        file: "encoders.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/streaming/references/encoders.md",
        path: "references/encoders.md",
      },
      {
        file: "resumable.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/streaming/references/resumable.md",
        path: "references/resumable.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill streaming",
    prompt:
      "Install the assistant-ui `streaming` skill with `npx skills add assistant-ui/skills --skill streaming`",
    slash: "/streaming",
    rawHref: "/.well-known/agent-skills/streaming/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/streaming/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/streaming",
  },
  {
    name: "cloud",
    title: "Cloud",
    summary: "Save threads and add auth with Assistant Cloud.",
    description:
      "Adds AssistantCloud backed persistence, authorization, and telemetry to assistant-ui apps. Use when wiring cross-session thread and message history, multi-device chat, message feedback, file uploads, or auth: passing `cloud` to `useChatRuntime` from `@assistant-ui/ai-sdk`, `AISDKThreads({ cloud })` for `AuiConfig` hosts, or `cloud` on `useLangGraphRuntime`. Covers constructing `AssistantCloud` with `authToken` (JWT), `apiKey` plus `userId`/`workspaceId` (server-side only), or `anonymous`; Clerk, Auth0, Supabase, and Firebase integrations and a backend token endpoint; the `cloud.threads`, `cloud.files`, `cloud.runs`, and `cloud.telemetry` client surface; and a custom `ThreadHistoryAdapter` on `CloudMessagePersistence`. Route here for threads that do not persist, 401s against the cloud API, or feedback buttons that do not save. For the `<ThreadList />` sidebar UI use thread-list; for the general adapter contracts use runtime.",
    group: "runtime",
    sections: [
      "Install",
      "Quick start: useChatRuntime",
      "AuiConfig hosts: AISDKThreads",
      "Migrate from Cloud AI SDK",
      "LangGraph: useLangGraphRuntime",
      "Message feedback",
      "Authentication",
      "Client API",
      "Environment variables",
      "Common Gotchas",
    ],
    references: [
      {
        file: "persistence.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/cloud/references/persistence.md",
        path: "references/persistence.md",
      },
      {
        file: "authorization.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/cloud/references/authorization.md",
        path: "references/authorization.md",
      },
      {
        file: "custom-persistence.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/cloud/references/custom-persistence.md",
        path: "references/custom-persistence.md",
      },
      {
        file: "auth-integrations.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/cloud/references/auth-integrations.md",
        path: "references/auth-integrations.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill cloud",
    prompt:
      "Install the assistant-ui `cloud` skill with `npx skills add assistant-ui/skills --skill cloud`",
    slash: "/cloud",
    rawHref: "/.well-known/agent-skills/cloud/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/cloud/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/cloud",
  },
  {
    name: "copilots",
    title: "Copilots",
    summary: "Let the assistant read and act on your app.",
    description:
      "Grounds an assistant in your app with assistant-ui copilots. Use when steering behavior with useAssistantInstructions, feeding send-time app state through useAssistantContext({ getContext }), exposing components with makeAssistantVisible(Component, { clickable, editable }), giving the model two-way component state through interactables (unstable_useInteractable for app-scoped panels, unstable_interactableTool inside defineToolkit for thread-scoped artifacts, mounted via AuiConfig({ unstable_interactables: unstable_Interactables() })), registering instructions and tools with aui.modelContext.register, or bridging model context across an iframe with AssistantFrameProvider and useAssistantFrameHost. Legacy Interactables(), useAssistantInteractable, and useInteractableState are deprecated in favor of the unstable_ API. Reach for this when the assistant should read the page, click or edit UI, or update component state. For LLM tools use tools; for runtime and thread state use runtime.",
    group: "runtime",
    sections: ["Orientation", "Interactables scope", "Common Gotchas"],
    references: [
      {
        file: "instructions.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/copilots/references/instructions.md",
        path: "references/instructions.md",
      },
      {
        file: "model-context.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/copilots/references/model-context.md",
        path: "references/model-context.md",
      },
      {
        file: "visible.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/copilots/references/visible.md",
        path: "references/visible.md",
      },
      {
        file: "interactables.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/copilots/references/interactables.md",
        path: "references/interactables.md",
      },
      {
        file: "assistant-frame.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/copilots/references/assistant-frame.md",
        path: "references/assistant-frame.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill copilots",
    prompt:
      "Install the assistant-ui `copilots` skill with `npx skills add assistant-ui/skills --skill copilots`",
    slash: "/copilots",
    rawHref: "/.well-known/agent-skills/copilots/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/copilots/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/copilots",
  },
  {
    name: "react-mcp",
    title: "React MCP",
    summary: "Let users connect their own MCP servers.",
    description:
      "Adds user managed browser MCP servers to assistant-ui with `@assistant-ui/react-mcp`. Use when mounting `McpManagerResource`, declaring `defineConnector` presets, persisting custom servers and OAuth state, composing `McpManagerPrimitive`, `McpServerPrimitive`, `McpAddFormPrimitive`, or `McpElicitationPrimitive`, handling an OAuth callback, browsing MCP resources, or diagnosing missing server tools, connection failures, and OAuth redirects. This covers end user chosen servers, not application owned backend MCP tools. For those use tools; for the chat runtime use runtime; for the copied dialog use elements.",
    group: "runtime",
    sections: [
      "Mount the manager",
      "Continue after frontend tool calls",
      "Use the configuration UI",
      "Render elicitation requests",
      "v1 scope",
      "Common Gotchas",
    ],
    references: [
      {
        file: "setup.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-mcp/references/setup.md",
        path: "references/setup.md",
      },
      {
        file: "ui.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-mcp/references/ui.md",
        path: "references/ui.md",
      },
      {
        file: "oauth.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-mcp/references/oauth.md",
        path: "references/oauth.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill react-mcp",
    prompt:
      "Install the assistant-ui `react-mcp` skill with `npx skills add assistant-ui/skills --skill react-mcp`",
    slash: "/react-mcp",
    rawHref: "/.well-known/agent-skills/react-mcp/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-mcp/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-mcp",
  },
  {
    name: "observability",
    title: "Observability",
    summary: "Trace model calls and show the spans in your UI.",
    description:
      "Instruments assistant-ui AI SDK backend routes with Langfuse, LangSmith, or Helicone, and renders independent trace data with the experimental @assistant-ui/react-o11y SpanResource and SpanPrimitive APIs. Use it when traces are missing, serverless spans are dropped, an AI SDK call needs provider metadata, Helicone is not proxying a provider, or a trace tree or timeline needs rendering. For streaming transport use streaming, for initial application wiring use setup, for Assistant Cloud persistence use cloud, and for copied styled trace UI use elements.",
    group: "runtime",
    sections: [
      "Choose the backend integration",
      "Implementation order",
      "Route handler boundary",
      "Render collected spans",
      "Common Gotchas",
    ],
    references: [
      {
        file: "langfuse.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/observability/references/langfuse.md",
        path: "references/langfuse.md",
      },
      {
        file: "langsmith.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/observability/references/langsmith.md",
        path: "references/langsmith.md",
      },
      {
        file: "helicone.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/observability/references/helicone.md",
        path: "references/helicone.md",
      },
      {
        file: "react-o11y.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/observability/references/react-o11y.md",
        path: "references/react-o11y.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill observability",
    prompt:
      "Install the assistant-ui `observability` skill with `npx skills add assistant-ui/skills --skill observability`",
    slash: "/observability",
    rawHref: "/.well-known/agent-skills/observability/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/observability/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/observability",
  },
  {
    name: "react-native",
    title: "React Native",
    summary: "Build chat for Expo and React Native.",
    description:
      'Build assistant-ui chat experiences for Expo and bare React Native with `@assistant-ui/react-native` and `@assistant-ui/ai-sdk`. Use when setting up an absolute mobile chat endpoint, `AssistantRuntimeProvider`, `useChatRuntime`, `AssistantChatTransport`, native `ThreadPrimitive`, `ComposerPrimitive`, `MessagePrimitive`, thread lists, attachments, React Native styles, `Metro` `withAui` for a `"use generative"` toolkit, local or remote thread adapters, or migrating a web chat surface to iOS and Android. Route here when a relative API URL fails on device, a native primitive lacks runtime state, `Metro` does not compile a toolkit, or web Elements are being used in a native app. Route web setup and DOM primitive work to `../setup/SKILL.md` and `../primitives/SKILL.md`.',
    group: "platforms",
    sections: [
      "Quick start",
      "Manual setup",
      "Native chat composition",
      "Generative toolkits",
      "Common Gotchas",
    ],
    references: [
      {
        file: "primitives.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-native/references/primitives.md",
        path: "references/primitives.md",
      },
      {
        file: "hooks.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-native/references/hooks.md",
        path: "references/hooks.md",
      },
      {
        file: "adapters.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-native/references/adapters.md",
        path: "references/adapters.md",
      },
      {
        file: "custom-backend.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-native/references/custom-backend.md",
        path: "references/custom-backend.md",
      },
      {
        file: "migration.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-native/references/migration.md",
        path: "references/migration.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill react-native",
    prompt:
      "Install the assistant-ui `react-native` skill with `npx skills add assistant-ui/skills --skill react-native`",
    slash: "/react-native",
    rawHref: "/.well-known/agent-skills/react-native/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-native/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/react-native",
  },
  {
    name: "ink",
    title: "Ink",
    summary: "Build chat for the terminal with Ink.",
    description:
      "Builds terminal chat UIs with @assistant-ui/react-ink and ANSI markdown with @assistant-ui/react-ink-markdown. Use when scaffolding `create --ink`, mounting `AssistantRuntimeProvider` around `useChatRuntime`, composing `ThreadPrimitive`, `ComposerPrimitive`, `MessagePrimitive`, `LoadingPrimitive`, `TextInput`, thread history, attachments, notifications, and terminal keyboard navigation, or when a chat needs grapheme safe editing, multiline display columns, an absolute backend URL, local file storage, or a custom `RemoteThreadListAdapter`. Route terminal markdown, tool output, message rendering, and Ink focus problems here. For browser application setup, web elements, and the standard web runtime, use setup.",
    group: "platforms",
    sections: [
      "Start a terminal app",
      "Compose a terminal thread",
      "Terminal input behavior",
      "Markdown in the terminal",
      "Common Gotchas",
    ],
    references: [
      {
        file: "primitives.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/ink/references/primitives.md",
        path: "references/primitives.md",
      },
      {
        file: "hooks.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/ink/references/hooks.md",
        path: "references/hooks.md",
      },
      {
        file: "adapters.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/ink/references/adapters.md",
        path: "references/adapters.md",
      },
      {
        file: "custom-backend.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/ink/references/custom-backend.md",
        path: "references/custom-backend.md",
      },
      {
        file: "migration.md",
        href: "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/ink/references/migration.md",
        path: "references/migration.md",
      },
    ],
    command: "npx skills add assistant-ui/skills --skill ink",
    prompt:
      "Install the assistant-ui `ink` skill with `npx skills add assistant-ui/skills --skill ink`",
    slash: "/ink",
    rawHref: "/.well-known/agent-skills/ink/SKILL.md",
    sourceFileHref:
      "https://raw.githubusercontent.com/assistant-ui/skills/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/ink/SKILL.md",
    sourceHref:
      "https://github.com/assistant-ui/skills/tree/53b2631fa16d2904e10d7cb9382bda4bec04649e/assistant-ui/skills/ink",
  },
];
