"use client";

import {
  AssistantIf,
  ThreadPrimitive,
  useAssistantApi,
} from "@assistant-ui/react";
import { type FC, useEffect } from "react";
import {
  SidebarAssistantMessage,
  SidebarUserMessage,
} from "./sidebar-messages";
import { SidebarComposer } from "./sidebar-composer";
import { SidebarContextUsage } from "./sidebar-context-usage";
import { useChatPanel } from "@/components/docs/contexts/chat-panel";

function PendingMessageHandler() {
  const { pendingMessage, clearPendingMessage } = useChatPanel();
  const api = useAssistantApi();

  useEffect(() => {
    if (!pendingMessage) return;

    const isRunning = api.thread().getState().isRunning;
    if (!isRunning) {
      api.thread().append(pendingMessage);
      clearPendingMessage();
    }
  }, [pendingMessage, clearPendingMessage, api]);

  return null;
}

export const SidebarThread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <PendingMessageHandler />
      <ThreadPrimitive.Viewport className="scrollbar-none flex flex-1 flex-col overflow-y-auto px-3 pt-3">
        <AssistantIf condition={({ thread }) => thread.isEmpty}>
          <SidebarWelcome />
        </AssistantIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage: SidebarUserMessage,
            AssistantMessage: SidebarAssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background">
          <SidebarComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
      <SidebarContextUsage />
    </ThreadPrimitive.Root>
  );
};

const SidebarWelcome: FC = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <p className="text-muted-foreground text-sm">
        Ask me anything about assistant-ui
      </p>
    </div>
  );
};
