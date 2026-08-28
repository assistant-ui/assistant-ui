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
        title: "What can you do",
        label: "as a Gemini-powered agent?",
        prompt: "What can you do?",
      },
      {
        title: "Tell me about",
        label: "the Google ADK framework",
        prompt: "Tell me about Google ADK and what it enables.",
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
    <div className="h-dvh">
      <ThreadWithSuggestions />
    </div>
  );
}
