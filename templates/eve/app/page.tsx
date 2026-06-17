"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  Suggestions,
  useAui,
} from "@assistant-ui/react";
import { useEveAgentRuntime } from "@assistant-ui/eve";

export default function Home() {
  const runtime = useEveAgentRuntime();
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Explain Eve",
        label: "and the Next.js plugin",
        prompt:
          "Explain how an Eve agent is mounted into this Next.js app in two short paragraphs.",
      },
      {
        title: "Draft an agent",
        label: "for product support",
        prompt:
          "Draft a concise set of instructions for an Eve agent that helps with product support.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} aui={aui}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
