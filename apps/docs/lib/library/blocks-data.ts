export type LibraryBlock = {
  slug: string;
  title: string;
  description: string;
  image: { light: string; dark: string };
  /** What it is built with; search reads these. */
  stack: readonly string[];
  useCases: readonly string[];
  /** What to tell a coding agent to add it. */
  prompt: string;
};

export const LIBRARY_BLOCKS: readonly LibraryBlock[] = [
  {
    slug: "document-editor",
    title: "Document editor",
    description:
      "A pages app with a floating assistant that edits the page you are on and waits for you to accept each change.",
    image: {
      light: "/screenshot/blocks/document-editor-light.webp",
      dark: "/screenshot/blocks/document-editor-dark.webp",
    },
    stack: ["Lexical", "Base UI", "AI SDK", "OpenAI"],
    useCases: [
      "A notes or docs product where an assistant drafts and restructures the page in place, and each edit waits for a yes.",
      "To-do lists, trackers and weekly updates that start from a template and stay editable.",
      "Review by comment, with threads on a passage that people and the assistant both answer and react to.",
      "A starting point for any page the model edits through interactables, with the document swapped for your own state.",
    ],
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Document editor block from https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/document-editor",
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
    stack: ["assistant-ui", "AI SDK", "shadcn/ui", "Tailwind CSS"],
    useCases: [
      "An image tool where each chat is one picture and the changes asked of it.",
      "A starting page of templates that set up a request before a word is typed.",
      "A shell to copy for any single-page tool: a sidebar of chats, the page, and the person at the foot.",
    ],
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Images block from https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/images",
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
    stack: ["shadcn/ui", "Tailwind CSS", "React"],
    useCases: [
      "A starting point for a chat whose markup and styles are all yours.",
      "A reference for how each primitive is composed, with every one in a single file.",
      "A chat to try a design on before you wire up a model.",
    ],
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Chat basic block from https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(blocks)/blocks/demos/chat-basic",
  },
];
