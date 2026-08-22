"use client";

import {
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { anonymousSessionFetch } from "@/lib/anonymous-session-client";
import { feedbackAdapter } from "@/lib/feedback-adapter";

export function PlaygroundRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      fetch: anonymousSessionFetch,
    }),
    adapters: {
      feedback: feedbackAdapter,
      speech: new WebSpeechSynthesisAdapter(),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
