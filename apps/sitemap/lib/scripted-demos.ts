import { DEMO_META } from "@/lib/demos-meta";

/**
 * A demo's one file, shown under its own `name` and read from `source` in this
 * app. Its preview runs the file's Thread with the runtime swapped for a script.
 */
export type ScriptedDemoFile = { name: string; source: string };

/**
 * One thing the runtime handles, shown as a scripted Thread. A demo with no
 * `file` is not built yet.
 */
export type ScriptedDemo = {
  id: string;
  title: string;
  description: string;
  hooks: readonly string[];
  file?: ScriptedDemoFile;
  /** Whether its preview offers the Parts view: each `data-slot` part outlined and named. */
  parts?: boolean;
  /** Where the row links; the AI SDK setup docs when absent. */
  link?: { href: string; label: string };
};

/**
 * The Thread, then the ten things the home page's "What the runtime handles"
 * cycles through, each a scripted Thread with suggestions to start from.
 */
export const SCRIPTED_DEMOS: readonly ScriptedDemo[] = [
  {
    id: "thread",
    title: "Thread",
    description:
      "The chat itself: messages, the composer, suggestions, and Copy and Retry on each reply, built from primitives in one file.",
    hooks: [
      "useChatRuntime",
      "AssistantChatTransport",
      "ThreadPrimitive",
      "MessagePrimitive",
      "ComposerPrimitive",
      "Suggestions",
    ],
    file: {
      name: "thread.tsx",
      source: "components/demos/thread.tsx",
    },
    parts: true,
  },
  {
    id: "streaming",
    title: "Streaming",
    description:
      "Replies stream in through the Streaming text element, and a card gives the install command and the prompt.",
    hooks: [
      "useChatRuntime",
      "AssistantChatTransport",
      "Suggestions",
      "defineToolkit",
      "StreamingText",
    ],
    file: {
      name: "streaming-text.tsx",
      source: "components/demos/streaming-text.tsx",
    },
  },
  {
    id: "reasoning",
    title: "Reasoning",
    description:
      "The model's thinking shows in a section that opens and closes, before the answer.",
    hooks: [],
  },
  {
    id: "tools",
    title: "Tools",
    description:
      "The model calls a tool, and the result is drawn as a card in the thread.",
    hooks: [],
  },
  {
    id: "approval",
    title: "Approval",
    description: "A tool waits for the user to approve it before it runs.",
    hooks: [],
  },
  {
    id: "sources",
    title: "Sources",
    description: "A reply lists the sources it drew on.",
    hooks: [],
  },
  {
    id: "attachments",
    title: "Attachments",
    description:
      "Images and files go into the composer and are sent with the message.",
    hooks: [],
  },
  {
    id: "branching",
    title: "Branching",
    description:
      "Retrying or editing keeps every version of a reply, and arrows switch between them.",
    hooks: [],
  },
  {
    id: "suggestions",
    title: "Suggestions",
    description:
      "Prompts to click before the first message and after every reply.",
    hooks: [],
  },
  {
    id: "voice",
    title: "Voice",
    description: "Dictate a message, or have a reply read aloud.",
    hooks: [],
  },
  {
    id: "generative-ui",
    title: "Generative UI",
    description: "The model answers with a chart instead of text.",
    hooks: [],
  },
];

const CLONE_ORDER = ["chatgpt", "claude", "grok", "gemini", "perplexity"];

/**
 * Look-alikes remade from the docs' demos, each one file in
 * `components/demos` with its own sidebar, shown here on a script too.
 */
/** Clones rebuilt as a folder: the file, its data, and its theme. */
const CLONE_FOLDERS = new Set(["gemini"]);

export const CLONE_DEMOS: readonly ScriptedDemo[] = CLONE_ORDER.flatMap(
  (slug) => {
    const meta = DEMO_META.find((demo) => demo.slug === slug);
    if (!meta) return [];
    return [
      {
        id: slug,
        title: meta.name,
        description: meta.tagline,
        hooks: [],
        file: {
          name: `${slug}.tsx`,
          source: CLONE_FOLDERS.has(slug)
            ? `components/demos/${slug}/${slug}.tsx`
            : `components/demos/${slug}.tsx`,
        },
        link: { href: `/demos/${slug}`, label: "Open the full demo" },
      },
    ];
  },
);
