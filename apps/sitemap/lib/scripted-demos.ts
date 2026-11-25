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
};

/**
 * The ten things the home page's "What the runtime handles" cycles through,
 * each a scripted Thread that opens with "How does … work?".
 */
export const SCRIPTED_DEMOS: readonly ScriptedDemo[] = [
  {
    id: "streaming",
    title: "Streaming",
    description:
      "Replies arrive a few words at a time as the model writes them, and stop halfway when you press Stop.",
    hooks: [
      "useChatRuntime",
      "Suggestions",
      "SuggestionAdapter",
      "ThreadPrimitive",
      "MessagePrimitive",
      "ComposerPrimitive",
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
