"use client";

import { useState, type ReactNode } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { AssistantPanelProvider } from "@/components/docs/assistant/context";
import type { XuluxTemplate } from "./templates/types";
import { XuluxShell } from "./shell/XuluxShell";

export type SelectedTemplateContext = Pick<
  XuluxTemplate,
  "id" | "title" | "description" | "kind" | "prompt" | "sourcePath" | "docsUrl"
>;

export function XuluxApp() {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [selectedTemplateContext, setSelectedTemplateContext] =
    useState<SelectedTemplateContext | null>(null);

  const resetSession = () => {
    setSelectedTemplateContext(null);
    setSessionId(crypto.randomUUID());
  };

  return (
    <XuluxRuntimeProvider
      key={`${sessionId}:${selectedTemplateContext?.id ?? ""}`}
      sessionId={sessionId}
      selectedTemplateContext={selectedTemplateContext}
    >
      <AssistantPanelProvider>
        <XuluxShell
          sessionId={sessionId}
          onSetSelectedTemplateContext={setSelectedTemplateContext}
          onResetSession={resetSession}
        />
      </AssistantPanelProvider>
    </XuluxRuntimeProvider>
  );
}

function XuluxRuntimeProvider({
  sessionId,
  selectedTemplateContext,
  children,
}: {
  sessionId: string;
  selectedTemplateContext: SelectedTemplateContext | null;
  children: ReactNode;
}) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/xulux/chat",
      body: {
        sessionId,
        selectedTemplate: selectedTemplateContext,
      },
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
