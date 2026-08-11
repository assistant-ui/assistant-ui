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
          "Show me a Q2 2026 sales dashboard. Revenue was $412k in April, $488k in May and $551k in June, on 1,284 orders, at a 3.4% conversion rate.",
      },
      {
        title: "Product analytics",
        label: "activation and retention",
        prompt:
          "How did we trend over the last six weeks? Activation went 41%, 44%, 43%, 48%, 52%, 55%, and week-4 retention went 22%, 24%, 23%, 27%, 29%, 31%.",
      },
      {
        title: "Support overview",
        label: "tickets and response time",
        prompt:
          "Give me a support overview. Open tickets: 12 urgent, 38 high, 91 normal, 24 low. Median first response is 47 minutes, down from 62 last week.",
      },
      {
        title: "Channel performance",
        label: "compare acquisition sources",
        prompt:
          "Compare our acquisition channels. Search: $18k spend, 420 conversions. Social: $11k, 260. Email: $3k, 190. Referral: $6k, 150.",
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
