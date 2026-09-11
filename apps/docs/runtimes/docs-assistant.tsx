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

  const runtime = useDocsChatRuntime({
    api: "/api/doc/chat",
    adapters,
    sendAutomatically: true,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantAnalyticsTracker />
      <AssistantPageContext />
      {children}
    </AssistantRuntimeProvider>
  );
}
