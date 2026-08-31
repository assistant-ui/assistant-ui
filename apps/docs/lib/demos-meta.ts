/** Demo metadata with no component references, so client bundles can list the
 *  demos without pulling in six full chat applications. */
export type DemoMeta = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  githubLink: string;
};

const GITHUB_EXAMPLES_BASE =
  "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/pages/examples";

export const DEMO_META: DemoMeta[] = [
  {
    slug: "base",
    name: "Base",
    tagline: "The full assistant-ui experience, unthemed.",
    description:
      "A complete chat application built from assistant-ui primitives: thread management, attachments, mentions, slash commands, model picker, and voice input.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/base.tsx`,
  },
  {
    slug: "chatgpt",
    name: "ChatGPT",
    tagline: "A ChatGPT look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the ChatGPT interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/chatgpt.tsx`,
  },
  {
    slug: "claude",
    name: "Claude",
    tagline: "A Claude look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the Claude interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/claude.tsx`,
  },
  {
    slug: "grok",
    name: "Grok",
    tagline: "A Grok look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the Grok interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/grok.tsx`,
  },
  {
    slug: "gemini",
    name: "Gemini",
    tagline: "A Gemini look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the Gemini interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/gemini.tsx`,
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    tagline: "A Perplexity look and feel, rebuilt on assistant-ui.",
    description:
      "Customized colors, typography, and layout that recreate the Perplexity interface on top of assistant-ui primitives.",
    githubLink: `${GITHUB_EXAMPLES_BASE}/perplexity.tsx`,
  },
];
