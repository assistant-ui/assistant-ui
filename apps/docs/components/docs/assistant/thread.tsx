"use client";

import {
  AssistantIf,
  ThreadPrimitive,
  useAssistantApi,
} from "@assistant-ui/react";
import { type FC, useEffect, useRef } from "react";
import { AssistantMessage, UserMessage } from "./messages";
import { AssistantComposer } from "./composer";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { AssistantFooter } from "@/components/docs/assistant/footer";

function PendingMessageHandler() {
  const { pendingMessage, clearPendingMessage } = useAssistantPanel();
  const api = useAssistantApi();
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingMessage || processedRef.current === pendingMessage) return;

    const isRunning = api.thread().getState().isRunning;
    if (!isRunning) {
      processedRef.current = pendingMessage;
      clearPendingMessage();
      api.thread().append(pendingMessage);
    }
  }, [pendingMessage, clearPendingMessage, api]);

  return null;
}

export const AssistantThread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <PendingMessageHandler />
      <ThreadPrimitive.Viewport className="scrollbar-none flex flex-1 flex-col overflow-y-auto px-3 pt-3">
        <AssistantIf condition={({ thread }) => thread.isEmpty}>
          <AssistantWelcome />
        </AssistantIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            AssistantMessage: AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background">
          <AssistantComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
      <AssistantFooter />
    </ThreadPrimitive.Root>
  );
};

const AssistantWelcome: FC = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <p className="text-muted-foreground text-sm">
        Ask me anything about assistant-ui
      </p>
    </div>
  );
};
