"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Tell me a story",
        label: "with multiple parts",
        prompt: "Tell me a short story with a beginning, middle, and end.",
      },
      {
        title: "Explain quantum computing",
        label: "in simple terms",
        prompt: "Explain quantum computing like I'm five years old.",
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
