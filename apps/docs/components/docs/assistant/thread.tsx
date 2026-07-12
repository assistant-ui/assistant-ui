"use client";

import {
  AuiIf,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { type ComponentType, type ReactNode, useEffect, useRef } from "react";
import { AssistantMessage, UserMessage } from "./messages";
import { AssistantComposer, useSharedDocsModelSelection } from "./composer";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { AssistantFooter } from "@/components/docs/assistant/footer";
import { analytics } from "@/lib/analytics";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { useThreadTokenUsage } from "@assistant-ui/react-ai-sdk";
import { getContextWindow } from "@/constants/model";
import { Button } from "@/components/ui/button";
import {
  PaletteIcon,
  PlugIcon,
  PlusIcon,
  RocketIcon,
  BookOpenIcon,
  XIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/radix/tooltip";

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

type AssistantThreadProps = {
  welcome?: ReactNode;
  composer?: ReactNode;
  footer?: ReactNode;
  UserMessageComponent?: ComponentType;
  AssistantMessageComponent?: ComponentType;
};

export function AssistantThread({
  welcome = <AssistantWelcome />,
  composer = <AssistantComposer />,
  footer = <AssistantFooter />,
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

        <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col overflow-visible rounded-t-xl">
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
  const lastUsage = useThreadTokenUsage();
  const contextTokens = lastUsage?.totalTokens ?? 0;
  const { modelValue } = useSharedDocsModelSelection();
  const contextWindow = getContextWindow(modelValue);
  const usagePercent = Math.min((contextTokens / contextWindow) * 100, 100);

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
      <span className="text-sm font-semibold">Ask AI</span>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const modelName = aui.thread().getModelContext()
                  ?.config?.modelName;
                analytics.assistant.newThreadClicked({
                  threadId,
                  previous_message_count: messages.length,
                  context_total_tokens: contextTokens,
                  context_usage_percent: usagePercent,
                  ...(pathname ? { pathname } : {}),
                  ...(modelName ? { model_name: modelName } : {}),
                });
                aui.threads().switchToNewThread();
              }}
              aria-label="New chat"
            >
              <PlusIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">New chat</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                analytics.assistant.panelToggled({
                  open: false,
                  source: "header",
                });
                setOpen(false);
              }}
              aria-label="Close chat"
            >
              <XIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Close chat</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  { prompt: "What is assistant-ui?", Icon: BookOpenIcon },
  { prompt: "How do I get started?", Icon: RocketIcon },
  { prompt: "How do I customize the styling?", Icon: PaletteIcon },
  { prompt: "How do I connect my own backend?", Icon: PlugIcon },
];

function AssistantWelcome(): React.ReactNode {
  return (
    <div className="flex flex-1 flex-col justify-end gap-0.5 pb-3">
      {SUGGESTIONS.map(({ prompt, Icon }) => (
        <ThreadPrimitive.Suggestion
          key={prompt}
          prompt={prompt}
          send
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
        >
          <Icon className="text-muted-foreground size-4 shrink-0" />
          {prompt}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}
