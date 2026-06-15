export const DEMO_DOWNLOAD_CATEGORY = {
  id: "assistant-ui-demos",
  name: "Assistant UI Demos",
  description:
    "Fixed assistant-ui demo surfaces shown as-is with downloadable starter apps.",
};

export type DemoDownloadSlug =
  | "base"
  | "chatgpt"
  | "claude"
  | "grok"
  | "gemini"
  | "perplexity";

export type DemoDownloadManifest = {
  slug: DemoDownloadSlug;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  entry: string;
  componentName: string;
  tags: string[];
  gradient: string;
  featured?: boolean;
  extraSourceFiles?: string[];
};

const COMMON_EXTRA_SOURCE_FILES = [
  "packages/ui/src/lib/utils.ts",
  "apps/docs/components/shared/dropdown-menu.tsx",
] as const;

const BASE_EXTRA_SOURCE_FILES = [
  "packages/ui/src/components/assistant-ui/attachment.tsx",
  "packages/ui/src/components/assistant-ui/badge.tsx",
  "packages/ui/src/components/assistant-ui/composer-trigger-popover.tsx",
  "packages/ui/src/components/assistant-ui/directive-text.tsx",
  "packages/ui/src/components/assistant-ui/dot-matrix.tsx",
  "packages/ui/src/components/assistant-ui/message-timing.tsx",
  "packages/ui/src/components/assistant-ui/model-selector.tsx",
  "packages/ui/src/components/assistant-ui/quote.tsx",
  "packages/ui/src/components/assistant-ui/reasoning.tsx",
  "packages/ui/src/components/assistant-ui/select.tsx",
  "packages/ui/src/components/assistant-ui/thread-list.tsx",
  "packages/ui/src/components/assistant-ui/tool-group.tsx",
  "packages/ui/src/components/ui/avatar.tsx",
  "packages/ui/src/components/ui/button.tsx",
  "packages/ui/src/components/ui/collapsible.tsx",
  "packages/ui/src/components/ui/command.tsx",
  "packages/ui/src/components/ui/dialog.tsx",
  "packages/ui/src/components/ui/popover.tsx",
  "packages/ui/src/components/ui/sheet.tsx",
  "packages/ui/src/components/ui/skeleton.tsx",
  "packages/ui/src/components/ui/tooltip.tsx",
] as const;

export const DEMO_DOWNLOAD_MANIFESTS: Record<
  DemoDownloadSlug,
  DemoDownloadManifest
> = {
  base: {
    slug: "base",
    name: "Base Assistant UI",
    tagline: "The full assistant-ui experience, unthemed.",
    description:
      "A complete chat application built from assistant-ui primitives: thread management, attachments, mentions, slash commands, model picker, and voice input.",
    features: [
      "Full assistant-ui thread layout with sidebar thread list",
      "Composer attachments, mentions, slash commands, voice, and model picker controls",
      "Message actions, branching controls, reasoning, quote selection, and tool fallback UI",
    ],
    entry: "apps/docs/components/examples/base.tsx",
    componentName: "Base",
    tags: ["assistant-ui", "base", "thread", "composer"],
    gradient: "from-zinc-500/35 via-neutral-400/25 to-slate-300/20",
    featured: true,
    extraSourceFiles: [
      ...COMMON_EXTRA_SOURCE_FILES,
      ...BASE_EXTRA_SOURCE_FILES,
    ],
  },
  chatgpt: {
    slug: "chatgpt",
    name: "ChatGPT Style Assistant",
    tagline: "A ChatGPT look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, tools menu, composer, and message layout that recreate the ChatGPT interface on top of assistant-ui primitives.",
    features: [
      "ChatGPT-style empty state, composer, tool menu, and dark mode treatment",
      "Assistant and user message layouts with actions, attachments, and branch controls",
      "Voice, dictation, and tool fallback UI wired through assistant-ui primitives",
    ],
    entry: "apps/docs/components/examples/chatgpt.tsx",
    componentName: "ChatGPT",
    tags: ["assistant-ui", "ChatGPT", "clone", "chat"],
    gradient: "from-emerald-500/35 via-zinc-400/25 to-neutral-300/20",
    featured: true,
    extraSourceFiles: [...COMMON_EXTRA_SOURCE_FILES],
  },
  claude: {
    slug: "claude",
    name: "Claude Style Assistant",
    tagline: "A Claude look and feel, rebuilt on assistant-ui.",
    description:
      "A Claude-inspired assistant surface with serif typography, warm visual styling, file controls, message actions, and compact composer interactions.",
    features: [
      "Claude-style empty state, composer, and warm document-like message surface",
      "Attachment, action, branch, and regeneration controls",
      "Dropdown controls and markdown rendering wired to assistant-ui primitives",
    ],
    entry: "apps/docs/components/examples/claude.tsx",
    componentName: "Claude",
    tags: ["assistant-ui", "Claude", "clone", "chat"],
    gradient: "from-orange-400/35 via-stone-300/25 to-zinc-200/20",
    extraSourceFiles: [...COMMON_EXTRA_SOURCE_FILES],
  },
  grok: {
    slug: "grok",
    name: "Grok Style Assistant",
    tagline: "A Grok look and feel, rebuilt on assistant-ui.",
    description:
      "A Grok-inspired assistant surface with minimal dark styling, center composer, icon branding, message actions, and concise controls.",
    features: [
      "Grok-style centered empty state and branded icon",
      "Minimal message viewport with action and branch controls",
      "Dropdown controls and markdown rendering wired to assistant-ui primitives",
    ],
    entry: "apps/docs/components/examples/grok.tsx",
    componentName: "Grok",
    tags: ["assistant-ui", "Grok", "clone", "chat"],
    gradient: "from-neutral-700/35 via-zinc-500/25 to-cyan-300/20",
    extraSourceFiles: [
      ...COMMON_EXTRA_SOURCE_FILES,
      "apps/docs/components/icons/grok.tsx",
    ],
  },
  gemini: {
    slug: "gemini",
    name: "Gemini Style Assistant",
    tagline: "A Gemini look and feel, rebuilt on assistant-ui.",
    description:
      "A Gemini-inspired assistant surface with suggested starter prompts, rounded composer controls, message actions, and lightweight visual styling.",
    features: [
      "Gemini-style empty state and composer",
      "Suggested prompt cards and message action controls",
      "Dropdown controls and markdown rendering wired to assistant-ui primitives",
    ],
    entry: "apps/docs/components/examples/gemini.tsx",
    componentName: "Gemini",
    tags: ["assistant-ui", "Gemini", "clone", "chat"],
    gradient: "from-blue-500/35 via-sky-300/25 to-rose-300/20",
    extraSourceFiles: [...COMMON_EXTRA_SOURCE_FILES],
  },
  perplexity: {
    slug: "perplexity",
    name: "Perplexity Style Assistant",
    tagline: "A Perplexity look and feel, rebuilt on assistant-ui.",
    description:
      "A Perplexity-inspired search assistant surface with focused input, source-like styling, message actions, and compact follow-up composer.",
    features: [
      "Perplexity-style search prompt and follow-up composer",
      "Source/search flavored controls and message actions",
      "Dropdown controls and markdown rendering wired to assistant-ui primitives",
    ],
    entry: "apps/docs/components/examples/perplexity.tsx",
    componentName: "Perplexity",
    tags: ["assistant-ui", "Perplexity", "clone", "search"],
    gradient: "from-teal-500/35 via-cyan-300/25 to-zinc-200/20",
    featured: true,
    extraSourceFiles: [...COMMON_EXTRA_SOURCE_FILES],
  },
};

export const DEMO_DOWNLOAD_SLUGS = Object.keys(
  DEMO_DOWNLOAD_MANIFESTS,
) as DemoDownloadSlug[];

export function getDemoDownloadManifest(slug: string) {
  return DEMO_DOWNLOAD_MANIFESTS[slug as DemoDownloadSlug];
}
