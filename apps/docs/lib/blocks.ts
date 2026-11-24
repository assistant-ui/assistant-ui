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
      light: "/screenshot/blocks/document-editor-light-v3.webp",
      dark: "/screenshot/blocks/document-editor-dark-v3.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/document-editor",
    previewUrl: "/blocks/demos/document-editor",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/document-editor",
      include: [
        "../chat-sidebar.tsx",
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
      "An image maker that turns a template or a message into a picture you edit beside the chat.",
    image: {
      light: "/screenshot/blocks/images-light-v2.webp",
      dark: "/screenshot/blocks/images-dark-v2.webp",
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
          "A gallery of tiles. A tile opens its picture, its prompt and an orientation to make it in, and using it writes the prompt in the message box.",
      },
      {
        title: "Message box",
        description:
          "One row: add, the words, the model, dictate and send. The model and the settings ride along as the message's run config.",
      },
      {
        title: "Model picker",
        description:
          "The Model selector element, listing every image model Modelpedia knows, grouped by provider and searchable. Models of a provider the route has no key for are listed but cannot be picked.",
      },
      {
        title: "Settings",
        description:
          "The add menu holds orientation, size, quality, complexity, number of images, output format, background, moderation and partial images, each a submenu showing what is chosen.",
      },
      {
        title: "Pictures",
        description:
          "One picture uses the Image element, with zoom, download, copy and make again. Several share the Image gallery element and one full-screen view.",
      },
      {
        title: "Changes",
        description:
          "A follow-up message changes the newest picture in the chat, which goes back to the model with the request.",
      },
      {
        title: "Editor",
        description:
          "Edit opens a picture in a panel beside the chat: draw or write on it, pin numbered notes, brush an area to erase, remove the background, or remake it in another shape. Each change is sent as a message and its result takes the picture's place.",
      },
      {
        title: "Reference pictures",
        description:
          "Pictures added by button or by drop sit in a strip above the message box and are sent as a starting point.",
      },
      {
        title: "Chat list",
        description:
          "The sidebar starts closed and lists each chat under its first request, with new and delete, kept in memory.",
      },
      {
        title: "My images",
        description:
          "A tab of every picture made on this visit, in the Image gallery element.",
      },
      {
        title: "Usage",
        description:
          "The person at the foot of the sidebar opens a count of pictures made and tokens used.",
      },
    ],
    requirements: [
      "React 19 and Tailwind CSS 4. The block's CSS file sets the shadcn/ui neutral colors the classes use.",
      "The shadcn/ui tooltip, dialog, popover, command and resizable components.",
      "An OpenAI key with access to an image model. The model a visit starts on is in data.json.",
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
    slug: "chat-basic",
    title: "Chat basic",
    description:
      "A whole chat written with every assistant-ui primitive, using only the shadcn/ui tooltip and resizable components.",
    image: {
      light: "/screenshot/blocks/chat-basic-light-v3.webp",
      dark: "/screenshot/blocks/chat-basic-dark-v3.webp",
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
  {
    slug: "generative-frame",
    title: "Generative frame",
    description:
      "A chat whose answers are live UI the model builds as it streams, from assistant-ui's components or as HTML in a sandboxed frame.",
    image: {
      light: "/screenshot/blocks/generative-frame-light.webp",
      dark: "/screenshot/blocks/generative-frame-dark.webp",
    },
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/generative-frame",
    previewUrl: "/blocks/demos/generative-frame",
    source: {
      directory: "apps/docs/app/(blocks)/blocks/demos/generative-frame",
      include: [
        "api",
        "components",
        ".env.example",
        "README.md",
        "block.css",
        "data.json",
        "layout.tsx",
        "page.tsx",
      ],
      entry: "components/generative-frame.tsx",
    },
    stack: [
      { name: "generative-frame", package: "@assistant-ui/react" },
      { name: "Generative UI", package: "@assistant-ui/react" },
      { name: "AI SDK", package: "ai" },
      { name: "OpenAI", package: "@ai-sdk/openai" },
    ],
    useCases: [
      "Answers that are easier to use than to read: calculators, charts, quizzes, timers and small games.",
      "A chat where a person asks for a change to a widget and the same widget updates.",
      "A starting point for model-written UI that runs sandboxed, away from the page and its data.",
    ],
    capabilities: [
      {
        title: "Two ways to draw",
        description:
          "Plans, comparisons, guides and forms come as a spec drawn with assistant-ui's generative UI vocabulary, with no model code running. Calculators, games and drawings come as HTML in a sandboxed frame.",
      },
      {
        title: "Built as it streams",
        description:
          "A spec draws each element as its patch arrives. A frame renders its code as it is written, keeps finished parts in place, and runs scripts once the code is whole.",
      },
      {
        title: "Changes in place",
        description:
          "Asking for a change edits the widget already in the chat, so the new version replaces the old one instead of piling up below it.",
      },
      {
        title: "Errors the model sees",
        description:
          "A widget's result waits for its frame. A script error or a blank render goes back to the model, which can fix it.",
      },
      {
        title: "Theme in the frame",
        description:
          "Each frame reads the block's colors, including a chart palette, and follows light and dark as the page switches.",
      },
      {
        title: "Widgets that talk back",
        description:
          "A widget can put a prompt in the message box for the person to send, such as a follow-up from a quiz.",
      },
      {
        title: "Gallery",
        description:
          "A new chat shows fifteen answers drawn live and usable in place: specs such as a budget, a trip plan and an RSVP form, and widgets such as a focus timer and a quiz. Start sends a tile's prompt and the chat builds it as it streams.",
      },
      {
        title: "Message box",
        description:
          "One row: add files, the words, dictate and send. A status line under the reply says what is happening until the closing words arrive.",
      },
    ],
    requirements: [
      "React 19 and Tailwind CSS 4. The block's CSS file sets the shadcn/ui neutral colors the classes and the frames use.",
      "The shadcn/ui tooltip component, for the labels on the icon buttons.",
      "An OpenAI key. The model is named in data.json.",
      "Your own sign-in and rate limit in front of the route before you deploy it.",
    ],
    env: {
      note: "The route answers 404 until it is switched on, and 401 without a key.",
      variables: [
        {
          name: "OPENAI_API_KEY",
          required: true,
          description: "The key the route calls the model with.",
        },
        {
          name: "BLOCKS_LIVE_API",
          required: true,
          description: 'Set to "true" to let the route run.',
        },
      ],
    },
  },
];

export function getBlock(slug: string): Block | undefined {
  return BLOCKS.find((block) => block.slug === slug);
}
