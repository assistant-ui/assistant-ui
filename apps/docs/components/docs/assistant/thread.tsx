"use client";

import {
  AuiIf,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { useEffect, useRef } from "react";
import { AssistantMessage, UserMessage } from "./messages";
import { AssistantComposer } from "./composer";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { AssistantFooter } from "@/components/docs/assistant/footer";
import { analytics } from "@/lib/analytics";
import { useCurrentPage } from "@/components/docs/contexts/current-page";

function PendingMessageHandler() {
  const { pendingMessage, clearPendingMessage } = useAssistantPanel();
  const aui = useAui();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const threadId = useAuiState((s) => s.threadListItem.id);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingMessage || processedRef.current === pendingMessage) return;
    if (isRunning) return;

    processedRef.current = pendingMessage;
    clearPendingMessage();
    analytics.assistant.messageSent({
      threadId,
      source: "ask_ai",
      message_length: pendingMessage.length,
      attachments_count: 0,
      ...(pathname ? { pathname } : {}),
      ...(() => {
        try {
          const modelName = aui.thread().getModelContext()?.config?.modelName;
          return modelName ? { model_name: modelName } : {};
        } catch {
          return {};
        }
      })(),
    });
    aui.thread().append(pendingMessage);
  }, [pendingMessage, clearPendingMessage, aui, isRunning, threadId, pathname]);

  return null;
}

export function AssistantThread(): React.ReactNode {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <PendingMessageHandler />
      <ThreadPrimitive.Viewport className="scrollbar-none flex flex-1 flex-col overflow-y-auto px-3 pt-3">
        <AuiIf condition={({ thread }) => thread.isEmpty}>
          <AssistantWelcome />
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background">
          <AssistantComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
      <AssistantFooter />
    </ThreadPrimitive.Root>
  );
}

function AssistantWelcome(): React.ReactNode {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <p className="text-muted-foreground text-sm">
        Ask me anything about assistant-ui
      </p>
    </div>
  );
}
