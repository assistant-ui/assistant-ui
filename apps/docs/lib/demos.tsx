import type { FC } from "react";
import { Base } from "@/components/examples/base";
import { ChatGPT } from "@/components/examples/chatgpt";
import { Claude } from "@/components/examples/claude";
import { Gemini } from "@/components/examples/gemini";
import { Grok } from "@/components/examples/grok";
import { Perplexity } from "@/components/examples/perplexity";

export type DemoEntry = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  githubLink: string;
  component: FC;
};

const GITHUB_EXAMPLES_BASE =
  "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples";

export const DEMOS: DemoEntry[] = [
  {
    slug: "base",
    name: "Base",
    tagline: "The full assistant-ui experience, unthemed.",
    description:
      "A complete chat application built from assistant-ui primitives: thread management, attachments, mentions, slash commands, model picker, and voice input.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/base.tsx`,
    component: Base,
  },
  {
    slug: "chatgpt",
    name: "ChatGPT",
    tagline: "A ChatGPT look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the ChatGPT interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/chatgpt.tsx`,
    component: ChatGPT,
  },
  {
    slug: "claude",
    name: "Claude",
    tagline: "A Claude look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the Claude interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/claude.tsx`,
    component: Claude,
  },
  {
    slug: "grok",
    name: "Grok",
    tagline: "A Grok look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the Grok interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/grok.tsx`,
    component: Grok,
  },
  {
    slug: "gemini",
    name: "Gemini",
    tagline: "A Gemini look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the Gemini interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/gemini.tsx`,
    component: Gemini,
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    tagline: "A Perplexity look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the Perplexity interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/perplexity.tsx`,
    component: Perplexity,
  },
];

export function getDemo(slug: string): DemoEntry | undefined {
  return DEMOS.find((demo) => demo.slug === slug);
}
