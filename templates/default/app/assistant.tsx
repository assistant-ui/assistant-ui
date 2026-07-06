"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantShell } from "@/components/assistant-ui/assistant-shell";
import { MessagesSquare } from "lucide-react";

export const Assistant = () => {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantShell
        logo={<MessagesSquare className="size-5" />}
        title="assistant-ui"
      >
        <Thread />
      </AssistantShell>
    </AssistantRuntimeProvider>
  );
};
