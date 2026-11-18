export type BlockCapability = {
  title: string;
  description: string;
};

export type BlockEnvVar = {
  name: string;
  required: boolean;
  description: string;
};

export type BlockSource = {
  /** Folder of the block, relative to the repository root. */
  directory: string;
  /**
   * Folders and root files the Code tab shows, relative to `directory`. The
   * list is closed so a local key file beside them is never read.
   */
  include: readonly string[];
  entry: string;
};

export type Block = {
  slug: string;
  title: string;
  description: string;
  image: { light: string; dark: string };
  githubLink: string;
  /** Address of a running copy to frame; the page shows the screenshot without one. */
  previewUrl: string | null;
  source: BlockSource;
  problem: string;
  useCases: readonly string[];
  capabilities: readonly BlockCapability[];
  requirements: readonly string[];
  env: {
    note: string;
    variables: readonly BlockEnvVar[];
  };
};

const isDevelopment = process.env.NODE_ENV === "development";

export const BLOCKS: readonly Block[] = [
  {
    slug: "agent-document-editor",
    title: "Agent document editor",
    description:
      "A rich text document that you and an assistant edit together, with comments and version history.",
    image: {
      light: "/screenshot/blocks/agent-document-editor-light.webp",
      dark: "/screenshot/blocks/agent-document-editor-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-agent-document-editor",
    // The block has no deployment, so only development has a copy to frame:
    // `pnpm --filter with-agent-document-editor dev --port 3210`.
    previewUrl: isDevelopment ? "http://localhost:3210" : null,
    source: {
      directory: "examples/with-agent-document-editor",
      include: [
        "app",
        "components",
        "lib",
        ".env.example",
        "components.json",
        "next.config.ts",
        "package.json",
        "postcss.config.mjs",
        "tsconfig.json",
        "vitest.config.ts",
      ],
      entry: "app/page.tsx",
    },
    problem:
      "A chat assistant answers in the chat, so an edit to a document comes back as a copy to paste over the original. Here the document is state that you and the model both write to. The model sends only the blocks it changes, the edit is typed into the page as it streams, and every change can be undone or restored from history.",
    useCases: [
      "A writing tool where an assistant drafts, tightens or restructures a document in place.",
      "Notes, specs and articles reviewed through comments left by people and by the assistant.",
      "An editor that keeps a record of every assistant edit, with a diff and a way back.",
      "A starting point for any surface the model edits through interactables, with the document swapped for your own state.",
    ],
    capabilities: [
      {
        title: "Edits typed into the page",
        description:
          "An edit streams into the document itself, with a shimmer on the block being rewritten and the newest words in the live color.",
      },
      {
        title: "Ask about a highlighted passage",
        description:
          "Highlight text and ask about only that. The passage reaches the model as a quote, and one-click rewrites improve, shorten, lengthen, simplify or fix the spelling.",
      },
      {
        title: "Comments",
        description:
          "You and the assistant leave comments anchored to a passage, then reply to, resolve or delete them.",
      },
      {
        title: "Version history",
        description:
          "Each edit is a version with a diff for every block it changed. Any version can be restored, and the newest edit has an Undo link in the chat.",
      },
      {
        title: "One panel for chat, comments and history",
        description:
          "The three share a resizable panel beside the document, and earlier chats stay in a Chats menu.",
      },
      {
        title: "Slash menus",
        description:
          "Typing / in the document inserts a heading, list, quote or divider. Typing / in the composer lists the suggestions.",
      },
      {
        title: "Dictation",
        description:
          "Speak a message where the browser can recognize speech, with a waveform while it listens.",
      },
      {
        title: "Sharing",
        description:
          "A share link carries the document in the address fragment, and the document copies or downloads as Markdown.",
      },
      {
        title: "Your own model key",
        description:
          "Pick a model from OpenAI, Anthropic or Google and give its key in the browser or on the server.",
      },
    ],
    requirements: [
      "Node.js 24.11 or newer and pnpm, to run it inside the assistant-ui repository.",
      "A key for at least one model provider: OpenAI, Anthropic or Google.",
      "A browser with speech recognition for dictation. Firefox has none, and everything else works without it.",
    ],
    env: {
      note: "Copy .env.example to .env.local in the block's folder. A key pasted with the key button in the app is used before these. The chat route has no sign-in, so add authentication and rate limiting before deploying with a server key.",
      variables: [
        {
          name: "OPENAI_API_KEY",
          required: false,
          description: "Server key for the OpenAI models.",
        },
        {
          name: "ANTHROPIC_API_KEY",
          required: false,
          description: "Server key for the Anthropic models.",
        },
        {
          name: "GOOGLE_GENERATIVE_AI_API_KEY",
          required: false,
          description: "Server key for the Google models.",
        },
      ],
    },
  },
];

export function getBlock(slug: string): Block | undefined {
  return BLOCKS.find((block) => block.slug === slug);
}
