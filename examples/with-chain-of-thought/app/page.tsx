"use client";

import {
  AssistantRuntimeProvider,
  Tools,
  useAui,
  AuiProvider,
  Suggestions,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { MyThread } from "./MyThread";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import toolkit from "./toolkit";

function MyThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Calculate Fibonacci(20)",
        label: "with chain of thought",
        prompt:
          "Calculate the 20th Fibonacci number using JavaScript and show your reasoning.",
      },
      {
        title: "Research with citations",
        label: "show sources",
        prompt:
          "Research recent developments in renewable energy and cite your sources.",
      },
    ]),
  });
  return (
    <AuiProvider value={aui}>
      <MyThread />
    </AuiProvider>
  );
}

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const aui = useAui({
    tools: Tools({ toolkit }),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <div className="h-full">
        <MyThreadWithSuggestions />
      </div>
    </AssistantRuntimeProvider>
  );
}
