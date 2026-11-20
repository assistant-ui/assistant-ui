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
    slug: "document-editor",
    title: "Document editor",
    description:
      "A pages app with a floating assistant that edits the page you are on and waits for you to accept each change.",
    image: {
      light: "/screenshot/blocks/document-editor-light.webp",
      dark: "/screenshot/blocks/document-editor-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/document-editor",
    previewUrl: "/blocks/demos/document-editor",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/document-editor",
      include: [
        "api",
        "components",
        "lib",
        ".env.example",
        "README.md",
        "data.json",
        "document-editor.css",
        "document-editor.tsx",
        "layout.tsx",
        "page.tsx",
      ],
      entry: "document-editor.tsx",
    },
    useCases: [
      "A notes or docs product where an assistant drafts and restructures the page in place, and each edit waits for a yes.",
      "To-do lists, trackers and weekly updates that start from a template and stay editable.",
      "Review by comment, with threads on a passage that people and the assistant both answer and react to.",
      "A starting point for any page the model edits through interactables, with the document swapped for your own state.",
    ],
    capabilities: [
      {
        title: "A floating assistant",
        description:
          "A bar at the bottom of the page that you can move, resize and minimise to a round button, which shows a dot when there is something new. It keeps a history of chats, takes files and dictation, and suggests what to ask next.",
      },
      {
        title: "Edits you review",
        description:
          "The assistant types its edit into the page under a flag with its name. In Manual mode the change is highlighted and waits for Undo, Ask for change or Accept. In Auto mode it lands at once.",
      },
      {
        title: "Rich text blocks and tables",
        description:
          "Headings, checklists, lists, quotes, dividers and tables with row and column menus, inserted from a / menu or the buttons at the top, with a format bar and Ask AI over selected text.",
      },
      {
        title: "Pages and subpages",
        description:
          "Add, rename, duplicate and delete pages, nest one under another, give each an emoji or an icon, link to a page with @, start from a template, and download a page as Markdown.",
      },
      {
        title: "Comments and reactions",
        description:
          "Select a passage to comment on it. Its thread floats beside it with replies, emoji reactions and resolve. Mention the assistant for a reply in the thread, or ask it to leave comments of its own.",
      },
      {
        title: "Blocks you can move and link to",
        description:
          "A grip beside each block drags it to a new place, turns it into another kind of block, and copies a link that opens the page at that block. An outline on the left edge jumps between headings.",
      },
    ],
    requirements: [
      "React 19 and Tailwind CSS 4. The block's CSS file sets the colors, fonts, weights and corners the classes use.",
      "Lexical for the editor, Base UI for menus and tooltips, and Hugeicons or Lucide for icons.",
      "A model of your own. The preview answers from a script in page.tsx, so swap it for useChatRuntime and the chat route to talk to a model.",
      "The page is saved in the browser's local storage. Replace the store in lib/document.ts to save it anywhere else.",
    ],
    env: {
      note: "Only needed to talk to a real model; the preview is scripted. Copy .env.example to .env.local. The chat route has no sign-in, so add authentication and rate limiting before deploying it with a key.",
      variables: [
        {
          name: "OPENAI_API_KEY",
          required: false,
          description: "Server key for the model the chat route calls.",
        },
        {
          name: "BLOCKS_LIVE_API",
          required: false,
          description:
            'Set to "true" to switch the chat route on. It answers 404 otherwise.',
        },
      ],
    },
  },
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
      "A whole chat written with every assistant-ui primitive and no component kit.",
    image: {
      light: "/screenshot/blocks/primitives-chat-light.webp",
      dark: "/screenshot/blocks/primitives-chat-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/primitives-chat",
    previewUrl: "/blocks/demos/primitives-chat",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/primitives-chat",
      include: ["components", "block.css", "layout.tsx", "page.tsx"],
      entry: "components/chat.tsx",
    },
    useCases: [
      "A starting point for a chat whose markup and styles are all yours.",
      "A reference for how each primitive is composed, with every one in a single file.",
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
      "React 19 and Tailwind CSS 4. The block's CSS file sets the shadcn/ui neutral colors the classes use.",
      "The shadcn/ui tooltip and resizable components, for the labels on the icon buttons and the sidebar you can drag.",
      "A model of your own. The chat answers from a script, so replace scriptedModel with a ChatModelAdapter or another assistant-ui runtime.",
      "A browser with speech synthesis for reading a reply aloud.",
    ],
  },
  {
    slug: "base",
    title: "Base",
    description:
      "A full chat on the assistant-ui components, with markdown, mentions, slash commands and a model picker.",
    image: {
      light: "/screenshot/blocks/base-light.webp",
      dark: "/screenshot/blocks/base-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/base",
    previewUrl: "/blocks/demos/base",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/base",
      include: ["components", "block.css", "layout.tsx", "page.tsx"],
      entry: "components/base.tsx",
    },
    useCases: [
      "A starting point for a product chat that needs more than plain text: markdown, tools and files.",
      "A chat where people reach tools and commands from the keyboard, with @ and /.",
      "A reference for theming the assistant-ui components without rewriting them.",
    ],
    capabilities: [
      {
        title: "Markdown replies",
        description:
          "Replies render headings, lists, tables and code, written as they stream.",
      },
      {
        title: "Mentions and commands",
        description:
          "Typing @ lists the tools to mention and / lists the commands, each inserted as a chip.",
      },
      {
        title: "Model picker",
        description: "Choose the model for the next message from the composer.",
      },
      {
        title: "Reasoning and tool calls",
        description:
          "Thinking and tool calls show as short lines that expand into their steps, with how long they took.",
      },
      {
        title: "Grouped suggestions",
        description:
          "Topics under the composer open into ready prompts on an empty chat.",
      },
      {
        title: "Files, quotes and dictation",
        description:
          "Attach files by button or drop, quote a passage from a reply, and speak a message where the browser supports it.",
      },
      {
        title: "Chat list",
        description:
          "A sidebar of chats that narrows to an icon rail, and a sheet with the same list on a phone.",
      },
      {
        title: "Message actions",
        description:
          "Copy, edit, regenerate, step between versions and export as Markdown, shown on hover.",
      },
    ],
    requirements: [
      "React 19 and Tailwind CSS 4. The block's CSS file sets the colors, fonts and corners the classes use.",
      "The assistant-ui components it imports, added with the shadcn CLI: thread list, attachments, markdown text, model selector, trigger popover, tool fallback and message timing.",
      "A runtime of your own. Here it runs on the docs site's chat runtime in page.tsx, so swap DocsRuntimeProvider for your model and replace the docs model list in the model picker.",
    ],
  },
];

export function getBlock(slug: string): Block | undefined {
  return BLOCKS.find((block) => block.slug === slug);
}
