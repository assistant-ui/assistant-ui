"use client";

import {
  AssistantRuntimeProvider,
  useAssistantInstructions,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { ReactNode } from "react";
import { useCurrentPage } from "@/components/docs/contexts/current-page";

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
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantPageContext />
      {children}
    </AssistantRuntimeProvider>
  );
}
