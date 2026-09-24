"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  SimpleImageAttachmentAdapter,
  Suggestions,
} from "@assistant-ui/react";
import { useFlueRuntime } from "@assistant-ui/react-flue";
import { useMemo, type PropsWithChildren } from "react";

const config = AuiConfig({
  suggestions: Suggestions([
    {
      title: "Explain this integration",
      label: "show how assistant-ui connects to Flue",
      prompt: "How is this chat wired together?",
    },
    {
      title: "Design a durable agent",
      label: "for a customer support workflow",
      prompt:
        "Design a durable customer support agent with tools and human approval.",
    },
    {
      title: "Test conversation memory",
      label: "then reload and continue chatting",
      prompt: "Remember that my favorite color is orange.",
    },
  ]),
});

export function FlueRuntimeProvider({
  conversationId,
  children,
}: PropsWithChildren<{ conversationId: string }>) {
  const adapters = useMemo(
    () => ({ attachments: new SimpleImageAttachmentAdapter() }),
    [],
  );
  const runtime = useFlueRuntime({
    url: `/api/agents/chat/${conversationId}`,
    adapters,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      {children}
    </AssistantRuntimeProvider>
  );
}
