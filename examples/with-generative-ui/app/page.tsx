"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { ExampleNav } from "@/components/example-nav";
import toolkit from "./present-toolkit";

export default function Home() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/present" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const config = AuiConfig({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "Sales dashboard",
        label: "for last quarter",
        prompt:
          "Show me a sales dashboard for Q2 2026: revenue, orders, and conversion rate, with monthly revenue broken out.",
      },
      {
        title: "Product analytics",
        label: "activation and retention",
        prompt:
          "How did activation and retention trend over the last six weeks? Include the weekly numbers.",
      },
      {
        title: "Support overview",
        label: "tickets and response time",
        prompt:
          "Give me a support overview: open tickets by priority, median first response time, and how the priorities compare.",
      },
      {
        title: "Channel performance",
        label: "compare acquisition sources",
        prompt:
          "Compare our acquisition channels on spend, conversions, and cost per acquisition.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider config={config} runtime={runtime}>
      <div className="flex h-full flex-col">
        <ExampleNav />
        <main className="min-h-0 flex-1">
          <Thread />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}
