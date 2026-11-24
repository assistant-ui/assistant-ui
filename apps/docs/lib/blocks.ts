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
    slug: "images",
    title: "Images",
    description:
      "An image maker: a gallery of templates, a message box that sets the shape and the detail, and a sidebar of the pictures you have made.",
    image: {
      light: "/screenshot/blocks/images-light.webp",
      dark: "/screenshot/blocks/images-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/images",
    previewUrl: "/blocks/demos/images",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/images",
      include: [
        "../chat-sidebar.tsx",
        "api",
        "components",
        ".env.example",
        "README.md",
        "block.css",
        "data.json",
        "layout.tsx",
        "page.tsx",
      ],
      entry: "components/images.tsx",
    },
    stack: [
      { name: "AI SDK", package: "ai" },
      { name: "OpenAI", package: "@ai-sdk/openai" },
      { name: "shadcn/ui", package: "shadcn" },
      { name: "Tailwind CSS", package: "tailwindcss" },
    ],
    useCases: [
      "An image tool where each chat is one picture and the changes asked of it.",
      "A starting page of templates that set up a request before a word is typed.",
      "A shell to copy for any single-page tool: a sidebar of chats, the page, and the person at the foot.",
    ],
    capabilities: [
      {
        title: "Templates",
        description:
          "A gallery of tiles. A tile opens its picture, its prompt and a shape to make it in, and using it writes the prompt in the message box.",
      },
      {
        title: "Message box",
        description:
          "One row: add, the words, the level of detail, dictate and send. The add menu holds the aspect ratio, and the choices ride along as the message's run config.",
      },
      {
        title: "Changes",
        description:
          "A follow-up message changes the newest picture in the chat, which goes back to the model with the request.",
      },
      {
        title: "Reference pictures",
        description:
          "Pictures added by button or by drop sit in a strip above the message box and are sent as a starting point.",
      },
      {
        title: "Chat list",
        description:
          "The sidebar lists each chat under its first request, with new and delete, kept in memory.",
      },
      {
        title: "My images",
        description:
          "A tab of every picture made on this visit, each with a download button.",
      },
      {
        title: "Usage",
        description:
          "The person at the foot of the sidebar opens a count of pictures made and tokens used.",
      },
    ],
    requirements: [
      "React 19 and Tailwind CSS 4. The block's CSS file sets the shadcn/ui neutral colors the classes use.",
      "The shadcn/ui tooltip, dialog and resizable components.",
      "An OpenAI key with access to an image model. The model's name is in data.json.",
      "Your own sign-in and rate limit in front of the route before you deploy it, because every picture costs money.",
    ],
    env: {
      note: "The route answers 404 until it is switched on, and 401 without a key.",
      variables: [
        {
          name: "OPENAI_API_KEY",
          required: true,
          description: "The key the route makes pictures with.",
        },
        {
          name: "BLOCKS_LIVE_API",
          required: true,
          description: 'Set to "true" to let the route run.',
        },
      ],
    },
  },
  {
    slug: "tasks",
    title: "Tasks",
    description:
      "Scheduled tasks made by describing them: a schedule in the sidebar, each task's runs on the page, and a message box that is always there.",
    image: {
      light: "/screenshot/blocks/tasks-light.webp",
      dark: "/screenshot/blocks/tasks-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/tasks",
    previewUrl: "/blocks/demos/tasks",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/tasks",
      include: [
        "../chat-sidebar.tsx",
        "api",
        "components",
        ".env.example",
        "README.md",
        "block.css",
        "data.json",
        "layout.tsx",
        "page.tsx",
        "toolkit.tsx",
      ],
      entry: "components/tasks.tsx",
    },
    stack: [
      { name: "AI SDK", package: "ai" },
      { name: "OpenAI", package: "@ai-sdk/openai" },
      { name: "shadcn/ui", package: "shadcn" },
      { name: "Tailwind CSS", package: "tailwindcss" },
    ],
    useCases: [
      "Reminders and recurring briefings that a person sets up in plain words.",
      "A starting point for any tool where the model edits app state through tools and the page shows the result.",
      "A reference for a toolkit whose tools run in the browser and draw their own receipts.",
    ],
    capabilities: [
      {
        title: "Made by describing",
        description:
          "Say what should happen and when. The model works out the time and the repeat and calls a tool that creates the task.",
      },
      {
        title: "Schedule",
        description:
          "The sidebar groups tasks by when they next run: today, tomorrow, later, paused and done.",
      },
      {
        title: "Runs",
        description:
          "While the page is open, a task whose time has come sends its instruction to the model, which can search the web, and the result is kept under the task.",
      },
      {
        title: "Changes by chat",
        description:
          "With a task open, a message such as move it to nine renames, reschedules, pauses, runs or deletes it through the same tools.",
      },
      {
        title: "Message box",
        description:
          "Always at the foot of the page, with files by button or by drop, dictation, and send and stop.",
      },
      {
        title: "Usage",
        description:
          "The person at the foot of the sidebar opens a count of tasks, runs and the tokens the runs used.",
      },
    ],
    requirements: [
      "React 19 and Tailwind CSS 4. The block's CSS file sets the shadcn/ui neutral colors the classes use.",
      "The shadcn/ui tooltip, dialog and resizable components.",
      "The assistant-ui build plugin, withAui, which compiles the toolkit file.",
      "An OpenAI key. The model's name is in data.json.",
      "Your own scheduler to run tasks while the page is closed, and your own sign-in and rate limit in front of the routes before you deploy them.",
    ],
    env: {
      note: "The routes answer 404 until they are switched on, and 401 without a key.",
      variables: [
        {
          name: "OPENAI_API_KEY",
          required: true,
          description: "The key the routes call the model with.",
        },
        {
          name: "BLOCKS_LIVE_API",
          required: true,
          description: 'Set to "true" to let the routes run.',
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
      include: [
        "../chat-sidebar.tsx",
        "components",
        "block.css",
        "layout.tsx",
        "page.tsx",
      ],
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
];

export function getBlock(slug: string): Block | undefined {
  return BLOCKS.find((block) => block.slug === slug);
}
