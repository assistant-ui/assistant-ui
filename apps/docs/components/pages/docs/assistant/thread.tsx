"use client";

import {
  AuiIf,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { AssistantMessage, UserMessage } from "./messages";
import { AssistantComposer, useSharedDocsModelSelection } from "./composer";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { ContextDisplay } from "@assistant-ui/ui/components/react/assistant-ui/elements/context-display.aui";
import { analytics } from "@/lib/analytics";
import { useCurrentPage } from "@/components/pages/docs/contexts/current-page";
import {
  getThreadMessageTokenUsage,
  type ThreadTokenUsage,
} from "@assistant-ui/ai-sdk";
import { getContextWindow } from "@/lib/model";
import { XIcon } from "lucide-react";

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
          const modelName = aui.thread.getModelContext()?.config?.modelName;
          return modelName ? { model_name: modelName } : {};
        } catch {
          return {};
        }
      })(),
    });
    aui.thread.append(pendingMessage);
  }, [pendingMessage, clearPendingMessage, aui, isRunning, threadId, pathname]);

  return null;
}

type AssistantThreadProps = {
  welcome?: ReactNode;
  composer?: ReactNode;
  footer?: ReactNode;
  UserMessageComponent?: ComponentType;
  AssistantMessageComponent?: ComponentType;
};

export function AssistantThread({
  welcome = <AssistantWelcome />,
  composer = <AssistantComposer autoFocus />,
  footer,
  UserMessageComponent = UserMessage,
  AssistantMessageComponent = AssistantMessage,
}: AssistantThreadProps = {}): ReactNode {
  return (
    <ThreadPrimitive.Root className="bg-background flex h-full flex-col">
      <PendingMessageHandler />
      <PanelHeader />
      <ThreadPrimitive.Viewport className="flex flex-1 scrollbar-none flex-col overflow-y-auto overscroll-contain px-3 pt-3">
        <AuiIf condition={(s) => s.thread.isEmpty}>{welcome}</AuiIf>

        <div className="px-1.5" data-slot="thread-messages">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.role === "user") return <UserMessageComponent />;
              if (message.role === "assistant")
                return <AssistantMessageComponent />;
              return null;
            }}
          </ThreadPrimitive.Messages>
        </div>

        <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col overflow-visible">
          {composer}
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
      {footer}
    </ThreadPrimitive.Root>
  );
}

function PanelHeader(): React.ReactNode {
  const { setOpen } = useAssistantPanel();
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);
  const messages = useAuiState((s) => s.thread.messages);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;
  const contextUsage = useMemo<ThreadTokenUsage | undefined>(() => {
    // Each request's usage already counts the full prompt for that turn, so
    // context-window fill is the largest request seen, not the sum across
    // turns. The max only rises as the thread grows, which keeps the
    // indicator monotonic when server-side pruning shrinks a later prompt.
    let peak: ThreadTokenUsage | undefined;
    let peakTotal = -1;
    for (const message of messages) {
      const usage = getThreadMessageTokenUsage(message);
      if (!usage) continue;
      const total =
        usage.totalTokens ??
        (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      if (total >= peakTotal) {
        peak = { ...usage, totalTokens: total };
        peakTotal = total;
      }
    }
    return peak;
  }, [messages]);
  const contextTokens = contextUsage?.totalTokens ?? 0;
  const { modelValue } = useSharedDocsModelSelection();
  const contextWindow = getContextWindow(modelValue);
  const usagePercent = Math.min((contextTokens / contextWindow) * 100, 100);

  return (
    <div className="border-foreground/10 flex h-14 shrink-0 items-center justify-between border-b px-3.5">
      <span className="text-foreground text-sm font-medium">Ask AI</span>
      <div className="flex items-center gap-1">
        {contextTokens > 0 ? (
          <ContextDisplay.Text
            modelContextWindow={contextWindow}
            usage={contextUsage}
            side="bottom"
            className="hover:text-foreground text-[11px] transition-colors hover:bg-transparent"
          />
        ) : null}
        <button
          type="button"
          onClick={() => {
            const modelName = aui.thread.getModelContext()?.config?.modelName;
            analytics.assistant.newThreadClicked({
              threadId,
              previous_message_count: messages.length,
              context_total_tokens: contextTokens,
              context_usage_percent: usagePercent,
              ...(pathname ? { pathname } : {}),
              ...(modelName ? { model_name: modelName } : {}),
            });
            aui.threads.switchToNewThread();
          }}
          aria-label="New chat"
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-control flex min-h-11 items-center px-2 text-sm transition-colors focus-visible:outline-2"
        >
          New chat
        </button>
        <button
          type="button"
          onClick={() => {
            analytics.assistant.panelToggled({
              open: false,
              source: "header",
            });
            setOpen(false);
          }}
          aria-label="Close chat"
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-control flex size-11 items-center justify-center transition-colors focus-visible:outline-2"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "What is assistant-ui?",
  "How do I get started?",
  "How do I customize the styling?",
  "How do I connect my own backend?",
];

function AssistantWelcome(): React.ReactNode {
  return (
    <div className="flex flex-1 flex-col px-1.5 pt-5 pb-6">
      <h2 className="mb-5 text-base font-medium">Ask about the docs</h2>
      <div className="flex flex-col gap-1">
        {SUGGESTIONS.map((prompt) => (
          <ThreadPrimitive.Suggestion
            key={prompt}
            prompt={prompt}
            send
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.025] focus-visible:outline-ring -mx-2 flex min-h-11 w-full items-center px-2 py-2 text-left text-sm leading-relaxed transition-colors focus-visible:outline-2"
          >
            {prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}
