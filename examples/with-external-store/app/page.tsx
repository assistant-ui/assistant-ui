"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Send a test message",
        label: "to see the external store in action",
        prompt: "Hello! How does the external store work?",
      },
      {
        title: "Tell me a story",
        label: "to generate multiple messages",
        prompt: "Tell me a short story about a robot learning to paint.",
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
    <main className="h-dvh">
      <ThreadWithSuggestions />
    </main>
  );
}
