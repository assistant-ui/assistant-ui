"use client";

import type { ReactNode } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  DemoRuntimeProvider,
  feedbackAdapter,
  followUpAdapter,
  STARTER_CONFIG,
  useBrowserSpeech,
} from "@/registry/shared/lib/demo-runtime";

/**
 * The runtime a block's page runs on: the AI SDK route at /api/chat, or the
 * scripted demo when `demo` is set, which the page does when the project has
 * no model key yet. Adding the key switches the block to real replies.
 */
export function RuntimeProvider({
  demo,
  children,
}: {
  demo: boolean;
  children: ReactNode;
}) {
  return demo ? (
    <DemoRuntimeProvider>{children}</DemoRuntimeProvider>
  ) : (
    <ChatRouteRuntimeProvider>{children}</ChatRouteRuntimeProvider>
  );
}

function ChatRouteRuntimeProvider({ children }: { children: ReactNode }) {
  const speech = useBrowserSpeech();
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
    adapters: {
      ...speech,
      feedback: feedbackAdapter,
      suggestion: followUpAdapter,
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime} config={STARTER_CONFIG}>
      {children}
    </AssistantRuntimeProvider>
  );
}
