"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  useLocalRuntime,
} from "@assistant-ui/react";
import { SampleFrame } from "../sample-frame";

export function ChatWithSuggestions() {
  const runtime = useLocalRuntime({
    async *run() {
      yield { content: [{ type: "text", text: "This is a demo." }] };
    },
  });
  const config = AuiConfig({
    suggestions: Suggestions([
      {
        title: "Plan a project",
        label: "with milestones and risks",
        prompt: "Help me plan a small product launch.",
      },
      {
        title: "Explain a concept",
        label: "in plain language",
        prompt: "Explain retrieval-augmented generation simply.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

export function ThreadWelcomeSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <ChatWithSuggestions />
    </SampleFrame>
  );
}
