"use client";

import { useState, type ReactNode } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { AssistantPanelProvider } from "@/components/docs/assistant/context";
import { AssistantThread } from "@/components/docs/assistant/thread";

function XuluxRuntimeProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/xulux/chat",
      body: { sessionId },
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function useSessionId() {
  const [sessionId] = useState(() => crypto.randomUUID());
  return sessionId;
}

export default function XuluxPage() {
  const sessionId = useSessionId();

  return (
    <XuluxRuntimeProvider sessionId={sessionId}>
      <AssistantPanelProvider>
        <div className="h-screen w-full">
          <AssistantThread />
        </div>
      </AssistantPanelProvider>
    </XuluxRuntimeProvider>
  );
}
