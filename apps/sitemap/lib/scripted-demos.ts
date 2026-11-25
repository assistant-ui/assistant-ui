/**
 * A file shown in a demo's tabs: written out in `code`, or read from `source`,
 * a path in this app, when the demo runs that same file.
 */
export type ScriptedDemoFile =
  | { path: string; code: string }
  | { path: string; source: string };

/**
 * One thing the runtime handles, shown as a scripted Thread. A demo with no
 * `files` is not built yet.
 */
export type ScriptedDemo = {
  id: string;
  title: string;
  description: string;
  hooks: readonly string[];
  files: readonly ScriptedDemoFile[];
};

const THREAD: ScriptedDemoFile = {
  path: "components/thread.tsx",
  source: "components/demos/thread.tsx",
};

const CHAT_ROUTE = `import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}`;

const STREAMING_PAGE = `"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  type SuggestionAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/thread";

const PROMPTS = ["How does streaming text work?", "Can I stop a reply halfway?"];

/** After each reply, offers the questions other than the one just asked. */
const followUps: SuggestionAdapter = {
  async generate({ messages }) {
    const asked = messages
      .findLast((message) => message.role === "user")
      ?.content.map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    return PROMPTS.filter((prompt) => prompt !== asked).map((prompt) => ({
      prompt,
    }));
  },
};

export default function Page() {
  const runtime = useChatRuntime({ adapters: { suggestion: followUps } });
  const config = AuiConfig({ suggestions: Suggestions(PROMPTS) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`;

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
    hooks: ["useChatRuntime", "streamText", "Suggestions", "SuggestionAdapter"],
    files: [
      { path: "app/page.tsx", code: STREAMING_PAGE },
      THREAD,
      { path: "app/api/chat/route.ts", code: CHAT_ROUTE },
    ],
  },
  {
    id: "reasoning",
    title: "Reasoning",
    description:
      "The model's thinking shows in a section that opens and closes, before the answer.",
    hooks: [],
    files: [],
  },
  {
    id: "tools",
    title: "Tools",
    description:
      "The model calls a tool, and the result is drawn as a card in the thread.",
    hooks: [],
    files: [],
  },
  {
    id: "approval",
    title: "Approval",
    description: "A tool waits for the user to approve it before it runs.",
    hooks: [],
    files: [],
  },
  {
    id: "sources",
    title: "Sources",
    description: "A reply lists the sources it drew on.",
    hooks: [],
    files: [],
  },
  {
    id: "attachments",
    title: "Attachments",
    description:
      "Images and files go into the composer and are sent with the message.",
    hooks: [],
    files: [],
  },
  {
    id: "branching",
    title: "Branching",
    description:
      "Retrying or editing keeps every version of a reply, and arrows switch between them.",
    hooks: [],
    files: [],
  },
  {
    id: "suggestions",
    title: "Suggestions",
    description:
      "Prompts to click before the first message and after every reply.",
    hooks: [],
    files: [],
  },
  {
    id: "voice",
    title: "Voice",
    description: "Dictate a message, or have a reply read aloud.",
    hooks: [],
    files: [],
  },
  {
    id: "generative-ui",
    title: "Generative UI",
    description: "The model answers with a chart instead of text.",
    hooks: [],
    files: [],
  },
];
