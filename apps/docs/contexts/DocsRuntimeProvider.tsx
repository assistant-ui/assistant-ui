"use client";

import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
  CloudFileAttachmentAdapter,
  AssistantCloud,
  useAui,
  Tools,
  Suggestions,
  type FeedbackAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import docsToolkit from "@/lib/docs-toolkit";

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
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
        anonymous: true,
      }),
    [],
  );

  // Speech/dictation adapters keep internal state; create per component instance.
  const adapters = useMemo(
    () => ({
      speech: new WebSpeechSynthesisAdapter(),
      dictation: new WebSpeechDictationAdapter(),
      feedback: feedbackAdapter,
      attachments: new CloudFileAttachmentAdapter(assistantCloud),
    }),
    [assistantCloud],
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
        title: "Compare GDP",
        label: "of the US, China, and Japan",
        prompt: "Compare the GDP of the United States, China, and Japan.",
      },
      {
        title: "Compare frameworks",
        label: "React, Vue, and Svelte in a table",
        prompt:
          "Show a side-by-side comparison table of React, Vue, and Svelte.",
      },
      {
        title: "Build a dashboard",
        label: "of last year's revenue by quarter",
        prompt:
          "Build a dashboard of last year's revenue, broken down by quarter.",
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
