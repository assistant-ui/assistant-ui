"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useAui,
  AuiProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";

function ThreadWithSuggestions() {
  const aui = useAui();
  const config = AuiConfig({
    suggestions: Suggestions([
      {
        title: "What's the weather",
        label: "in Tokyo right now?",
        prompt: "What's the weather in Tokyo?",
      },
      {
        title: "Tell me a fun fact",
        label: "about any topic",
        prompt: "Tell me a fun fact about space.",
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
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <ThreadWithSuggestions />
      </div>
    </AssistantRuntimeProvider>
  );
}
