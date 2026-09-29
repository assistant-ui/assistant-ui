"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import {
  useAui,
  AuiProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";

function ThreadWithSuggestions() {
  const aui = useAui();
  const config = AuiConfig({
    suggestions: Suggestions([
      {
        title: "Start a conversation",
        label: "that persists across sessions",
        prompt: "Hello! What can you help me with today?",
      },
      {
        title: "Summarize a topic",
        label: "in a few paragraphs",
        prompt: "Give me a brief summary of how cloud computing works.",
      },
    ]),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      <Thread />
    </AuiProvider>
  );
}

export default function Home() {
  return (
    <main className="grid h-dvh grid-cols-[200px_1fr] grid-rows-[minmax(0,1fr)] gap-4 p-4">
      <ThreadList />
      <ThreadWithSuggestions />
    </main>
  );
}
