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
        prompt:
          "Hello there! Is there anything you'd like to talk about today?",
      },
      {
        title: "Summarize a topic",
        label: "in a few paragraphs",
        prompt: "Please briefly describe cloud computing.",
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
