"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";

function ThreadWithSuggestions() {
  const aui = useAui({
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
    <AuiProvider value={aui}>
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
