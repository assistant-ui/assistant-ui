"use client";

import { SimpleThread } from "@/components/simple-thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

export default function Home() {
  // Using the new simplified useChatRuntime hook
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <SimpleThread />
      </div>
    </AssistantRuntimeProvider>
  );
}
