"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
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
    <AuiProvider extends={aui} config={config}>
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
