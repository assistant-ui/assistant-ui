export type BlockCapability = {
  title: string;
  description: string;
};

export type BlockEnvVar = {
  name: string;
  required: boolean;
  description: string;
};

export type BlockStackItem = {
  name: string;
  /** Package whose mark stands for it on the card. */
  package: string;
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
  source: BlockSource;
  /** The main things the block is built with, the most particular first, four at most. */
  stack: readonly BlockStackItem[];
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
    stack: [
      { name: "Lexical", package: "lexical" },
      { name: "Base UI", package: "@base-ui/react" },
      { name: "AI SDK", package: "ai" },
      { name: "OpenAI", package: "@ai-sdk/openai" },
    ],
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
    slug: "chat-basic",
    title: "Chat basic",
    description:
      "A whole chat written with every assistant-ui primitive, using only the shadcn/ui tooltip and resizable components.",
    image: {
      light: "/screenshot/blocks/chat-basic-light.webp",
      dark: "/screenshot/blocks/chat-basic-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/chat-basic",
    previewUrl: "/blocks/demos/chat-basic",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/chat-basic",
      include: ["components", "block.css", "layout.tsx", "page.tsx"],
      entry: "components/chat.tsx",
    },
    stack: [
      { name: "shadcn/ui", package: "shadcn" },
      { name: "Tailwind CSS", package: "tailwindcss" },
      { name: "React", package: "react" },
    ],
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
    slug: "codex",
    title: "Codex",
    description:
      "A coding agent's chat in the look of Codex: a thread file and its own sidebar shell, with projects, a model menu, and the composer's strip and menus.",
    image: {
      light: "/screenshot/blocks/codex-light.webp",
      dark: "/screenshot/blocks/codex-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/codex",
    previewUrl: "/blocks/demos/codex",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/codex",
      include: [
        "codex.tsx",
        "codex-thread-shell.tsx",
        "codex.css",
        "data.json",
        "layout.tsx",
        "models.ts",
        "page.tsx",
      ],
      entry: "codex.tsx",
    },
    stack: [
      { name: "shadcn/ui", package: "shadcn" },
      { name: "Base UI", package: "@base-ui/react" },
      { name: "Hugeicons", package: "@hugeicons/react" },
      { name: "Tailwind CSS", package: "tailwindcss" },
    ],
    useCases: [
      "A starting point for a coding agent's chat, with the layout and theme already close to Codex.",
      "A pattern for giving a chat a product's look: one file for the thread, one for the sidebar shell around it, and a CSS file that starts from a shadcn/ui preset.",
      "A lookalike you can chat with, since the preview talks to a real model.",
    ],
    capabilities: [
      {
        title: "Thread shell",
        description:
          "A sidebar with a search, projects, and recent chats with archive, restore and delete. It folds away, and becomes a sheet on a narrow window.",
      },
      {
        title: "Organize menu",
        description:
          "A menu with submenus that lists chats by project or in one list, and keeps a sort order.",
      },
      {
        title: "Composer",
        description:
          "A message box under a strip that names where the work happens and which project it is in, with an add menu for files, dictation, send and stop.",
      },
      {
        title: "Model menu",
        description:
          "Lists the block's own models from models.ts with a reasoning level, and sends both with the next message.",
      },
      {
        title: "Approval menu",
        description:
          "Three levels of what the agent may do without asking, each with a line that says what it allows.",
      },
      {
        title: "Messages",
        description:
          "Markdown replies, reasoning and tool calls as lines that open, a tool's own interface where it has one, and errors under the reply.",
      },
      {
        title: "Message actions",
        description:
          "Copy, edit, try again, rate, and move between the versions of a reply.",
      },
    ],
    requirements: [
      "React 19 and Tailwind CSS 4. The block's CSS file sets the colors of the shadcn/ui preset it starts from (the Mira style, the neutral base and the blue accent), then the colors the look needs on top.",
      "Base UI for the menus, the shadcn/ui tooltip and sheet components, the assistant-ui Markdown text component, and the Hugeicons packages for the icons.",
      "A runtime of your own. The preview uses this site's chat runtime in page.tsx, so replace it with one such as useChatRuntime, and set the ids in models.ts to the models your route serves.",
      "The projects and branches in data.json are samples. The environment and approval menus keep their choice and change nothing else until your runtime reads them.",
    ],
  },
];

export function getBlock(slug: string): Block | undefined {
  return BLOCKS.find((block) => block.slug === slug);
}
