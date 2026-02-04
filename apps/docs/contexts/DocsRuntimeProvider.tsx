"use client";

import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
  AssistantCloud,
  useAui,
  Tools,
  Suggestions,
  type FeedbackAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { docsToolkit } from "@/lib/docs-toolkit";

// Stateless adapter - safe to share across instances
const feedbackAdapter: FeedbackAdapter = {
  submit: () => {
    // Feedback is tracked via analytics in AssistantActionBar
    // The runtime automatically updates message.metadata.submittedFeedback
  },
};

export function DocsRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const assistantCloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
        anonymous: true,
      }),
    [],
  );

  // Speech/dictation adapters have internal state - create per component instance
  const adapters = useMemo(
    () => ({
      speech: new WebSpeechSynthesisAdapter(),
      dictation: new WebSpeechDictationAdapter(),
      feedback: feedbackAdapter,
    }),
    [],
  );

  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    adapters,
    cloud: assistantCloud,
  });

  const aui = useAui({
    tools: Tools({ toolkit: docsToolkit }),
    suggestions: Suggestions([
      {
        title: "What's the weather",
        label: "in San Francisco?",
        prompt: "What's the weather in San Francisco?",
      },
      {
        title: "Explain React hooks",
        label: "like useState and useEffect",
        prompt: "Explain React hooks like useState and useEffect",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}

      <DevToolsModal />
    </AssistantRuntimeProvider>
  );
}
