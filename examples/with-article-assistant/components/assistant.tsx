"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { AssistantModal } from "@/components/assistant-ui/elements/assistant-modal.aui";
import { TooltipProvider } from "@/components/ui/tooltip";

const SUGGESTIONS = [
  {
    title: "How did Gerald end up",
    label: "on the electoral roll?",
    prompt: "How did Gerald end up on the electoral roll?",
  },
  {
    title: "Why does the council",
    label: "want to get rid of the fog?",
    prompt: "Why does the council want to get rid of the fog?",
  },
  {
    title: "Who supports Gerald,",
    label: "and who doesn't?",
    prompt: "Who supports Gerald, and who is against it?",
  },
  {
    title: "What is Gerald reading",
    label: "at the library?",
    prompt: "What is Gerald reading at the library?",
  },
];

/** The chat runtime and the modal launcher, over the page's content. */
export function Assistant({ children }: { children: ReactNode }) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
  });
  const config = AuiConfig({ suggestions: Suggestions(SUGGESTIONS) });
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <TooltipProvider>
        {children}
        <AssistantModal />
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}
