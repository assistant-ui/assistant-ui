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
  /**
   * Address the Preview tab frames: a deployed copy, or the docs page that
   * renders a demo block. The live site shows the screenshot without one.
   */
  previewUrl: string | null;
  /** Port the docs dev server starts the block on when it has no address. */
  devPort?: number;
  source: BlockSource;
  useCases: readonly string[];
  capabilities: readonly BlockCapability[];
  requirements: readonly string[];
  env?: {
    note: string;
    variables: readonly BlockEnvVar[];
  };
};

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
    previewUrl: null,
    devPort: 3210,
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
  {
    slug: "primitives-chat",
    title: "Primitives chat",
    description:
      "A whole chat in one file, written with every assistant-ui primitive and no component kit.",
    image: {
      light: "/screenshot/blocks/primitives-chat-light.webp",
      dark: "/screenshot/blocks/primitives-chat-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(home)/blocks/demos/primitives-chat",
    previewUrl: "/blocks-preview/primitives-chat",
    source: {
      directory: "apps/docs/app/(home)/blocks/demos/primitives-chat",
      include: ["chat.tsx"],
      entry: "chat.tsx",
    },
    useCases: [
      "A starting file for a chat whose markup and styles are all yours.",
      "A reference for how each primitive is composed, with every one in a single place.",
      "A chat to try a design on before you wire up a model.",
    ],
    capabilities: [
      {
        title: "Thread and messages",
        description:
          "A scrolling thread with a welcome screen, suggestions, a scroll-to-bottom button, and separate user and assistant messages.",
      },
      {
        title: "Composer",
        description:
          "Send and stop, files by button or by drop, a quoted passage, and a queue for messages sent while a reply is being written.",
      },
      {
        title: "Message actions",
        description:
          "Copy, edit, regenerate, read aloud, rate, and export as Markdown from a More menu.",
      },
      {
        title: "Branches",
        description:
          "Editing a message or regenerating a reply keeps the earlier version, and a picker moves between them.",
      },
      {
        title: "Reasoning and tool calls",
        description:
          "A collapsible Thinking block holds the reasoning and the tool call that came before the answer.",
      },
      {
        title: "Quoting",
        description:
          "Selecting text in a message shows a Quote button, and the passage is sent with the next message.",
      },
      {
        title: "Errors",
        description: "A failed reply shows its error under the message.",
      },
      {
        title: "Chat list",
        description:
          "A sidebar of chats with new, archive, restore and delete, kept in memory.",
      },
      {
        title: "Floating layout",
        description:
          "One button moves the same thread into a bubble in the corner of the page.",
      },
    ],
    requirements: [
      "React 19 and Tailwind CSS 4 with the shadcn/ui color tokens, such as background, muted and primary.",
      "A model of your own. The file answers from a script, so replace scriptedModel with a ChatModelAdapter or another assistant-ui runtime.",
      "A browser with speech synthesis for reading a reply aloud.",
    ],
  },
];

export function getBlock(slug: string): Block | undefined {
  return BLOCKS.find((block) => block.slug === slug);
}
