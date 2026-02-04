"use client";

import {
  AssistantRuntimeProvider,
  useAssistantInstructions,
  type FeedbackAdapter,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { ReactNode } from "react";
import { useCurrentPage } from "@/components/docs/contexts/current-page";

// Stateless adapter - safe to share across instances
const feedbackAdapter: FeedbackAdapter = {
  submit: () => {
    // Feedback is tracked via analytics in AssistantActionBar
    // The runtime automatically updates message.metadata.submittedFeedback
  },
};

function AssistantPageContext() {
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;

  useAssistantInstructions({
    instruction: pathname
      ? `The user is currently viewing: ${pathname}`
      : "The user is on the docs site.",
    disabled: !pathname,
  });

  return null;
}

export function DocsAssistantRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/doc/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    adapters: {
      feedback: feedbackAdapter,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantPageContext />
      {children}
    </AssistantRuntimeProvider>
  );
}
