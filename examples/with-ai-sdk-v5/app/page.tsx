"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";

export default function Home() {
  const chat = useChat();

  const runtime = useAISDKRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
