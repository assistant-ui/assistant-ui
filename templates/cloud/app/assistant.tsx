"use client";

import { AssistantRuntimeProvider, AssistantCloud } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantShell } from "@/components/assistant-ui/assistant-shell";

const cloud = new AssistantCloud({
  baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
  anonymous: true,
});

export const Assistant = () => {
  const runtime = useChatRuntime({
    cloud,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantShell>
        <Thread />
      </AssistantShell>
    </AssistantRuntimeProvider>
  );
};
