"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  SimpleImageAttachmentAdapter,
} from "@assistant-ui/react";
import { feedbackAdapter } from "@/lib/feedback-adapter";
import { useDocsChatRuntime } from "./chat-runtime";
import {
  AssistantAnalyticsTracker,
  AssistantPageContext,
} from "./assistant-analytics";

export function DocsAssistantRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const adapters = useMemo(
    () => ({
      feedback: feedbackAdapter,
      attachments: new SimpleImageAttachmentAdapter(),
    }),
    [],
  );

  // No automatic sending: the docs assistant has no browser tools, and the
  // server finishes every answer, so a reply never waits on the client.
  const runtime = useDocsChatRuntime({
    api: "/api/doc/chat",
    adapters,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantAnalyticsTracker />
      <AssistantPageContext />
      {children}
    </AssistantRuntimeProvider>
  );
}
