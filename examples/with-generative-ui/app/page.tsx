"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  Suggestions,
  Tools,
  useAui,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { ExampleNav } from "@/components/example-nav";
import toolkit from "./toolkit";

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const aui = useAui({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "Show a bar chart",
        label: "of quarterly revenue",
        prompt:
          "Create a bar chart showing quarterly revenue: Q1 $45k, Q2 $52k, Q3 $61k, Q4 $58k",
      },
      {
        title: "Pick a date",
        label: "for a meeting",
        prompt: "I need to schedule a meeting. Ask me to pick a date.",
      },
      {
        title: "Collect my contact info",
        label: "name, email, phone",
        prompt:
          "I want to sign up for the newsletter. Ask for my name, email, and phone number.",
      },
      {
        title: "Show me on the map",
        label: "the Eiffel Tower",
        prompt: "Show me the Eiffel Tower on a map",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <div className="flex h-full flex-col">
        <ExampleNav />
        <main className="min-h-0 flex-1">
          <Thread />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}
