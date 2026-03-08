"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "What's the weather",
        label: "in San Francisco?",
        prompt: "What's the weather like in San Francisco today?",
      },
      {
        title: "Tell me about yourself",
        label: "and your capabilities",
        prompt: "What can you help me with?",
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
    <MyRuntimeProvider>
      <div className="h-full">
        <ThreadWithSuggestions />
      </div>
    </MyRuntimeProvider>
  );
}
