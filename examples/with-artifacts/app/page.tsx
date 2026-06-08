"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  Tools,
  useAui,
  AuiProvider,
  Suggestions,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import toolkit from "./toolkit";

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Build a landing page",
        label: "as an HTML artifact",
        prompt:
          "Build a beautiful landing page for a coffee shop as an HTML artifact.",
      },
      {
        title: "Create an interactive counter",
        label: "as a React artifact",
        prompt:
          "Create an interactive counter with a styled button as a React artifact.",
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
  const runtime = useChatRuntime();
  const aui = useAui({
    tools: Tools({ toolkit }),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <main className="mx-auto h-full w-full max-w-3xl">
        <ThreadWithSuggestions />
      </main>
    </AssistantRuntimeProvider>
  );
}
