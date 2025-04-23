"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChat } from "ai/react";
import { Thread } from "@/components/assistant-ui/thread";
import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";

export const Assistant = () => {
  const chat = useChat({
    api: "/api/chat",
  });
  const runtime = useVercelUseChatRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh gap-x-2 px-4 py-4">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
