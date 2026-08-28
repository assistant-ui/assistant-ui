"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import {
  useAui,
  AuiProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

function ThreadWithSuggestions() {
  const aui = useAui();
  const config = AuiConfig({
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
    <AuiProvider extends={aui} config={config}>
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
