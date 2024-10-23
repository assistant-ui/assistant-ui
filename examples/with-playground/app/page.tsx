"use client";

import {
  AssistantPlayground,
  requestOptionsFromOpenAI,
} from "@assistant-ui/react-playground";
import { usePlaygroundRuntime } from "@assistant-ui/react-playground";
import { AssistantRuntimeProvider } from "@assistant-ui/react";

import "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism.css";

export default function Home() {
  const runtime = usePlaygroundRuntime({
    api: "/api/chat",
    initialMessages: [],
  });

  const handleLoadTestData = () => {
    runtime.thread.setRequestData(
      requestOptionsFromOpenAI({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: "Write a poem about the weather",
          },
          {
            role: "assistant",
            content: "The weather is sunny and warm.",
          },
        ],
      }),
    );
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <div className="mx-4 flex items-center justify-between border-b py-4">
          <h1 className="text-2xl font-bold">Playground</h1>
          <button
            className="bg-aui-primary text-aui-primary-foreground rounded-md px-4 py-2"
            onClick={handleLoadTestData}
          >
            Load Test Data
          </button>
        </div>
        <div className="flex-grow overflow-hidden">
          <div className="flex h-full flex-col">
            <AssistantPlayground />
          </div>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
