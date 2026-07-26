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
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { ContextDisplay } from "@assistant-ui/ui/components/assistant-ui/context-display";
import { analytics } from "@/lib/analytics";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import {
  getThreadMessageTokenUsage,
  type ThreadTokenUsage,
} from "@assistant-ui/react-ai-sdk";
import { getContextWindow } from "@/constants/model";
import { Button } from "@/components/ui/button";
import {
  PaletteIcon,
  PlugIcon,
  PlusIcon,
  RocketIcon,
  BookOpenIcon,
  SparklesIcon,
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
  footer,
  UserMessageComponent = UserMessage,
  AssistantMessageComponent = AssistantMessage,
}: AssistantThreadProps = {}): ReactNode {
  return (
    <ThreadPrimitive.Root className="bg-background flex h-full flex-col">
      <PendingMessageHandler />
      <PanelHeader />
      <ThreadPrimitive.Viewport className="flex flex-1 scrollbar-none flex-col overflow-y-auto overscroll-contain mask-[linear-gradient(to_bottom,transparent,black_2rem)] px-3 pt-3">
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
    <div className="flex h-12 shrink-0 items-center justify-between px-3">
      <span className="text-sm font-semibold">Ask AI</span>
      <div className="flex items-center gap-0.5">
        <ContextDisplay.Ring
          modelContextWindow={contextWindow}
          usage={contextUsage}
          side="bottom"
        />
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
    <div className="flex flex-1 flex-col pb-3">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="bg-muted/50 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
          <SparklesIcon className="size-5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">How can I help?</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Ask anything about assistant-ui.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {SUGGESTIONS.map(({ prompt, Icon }) => (
          <ThreadPrimitive.Suggestion
            key={prompt}
            prompt={prompt}
            send
            className="border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors"
          >
            <Icon className="text-muted-foreground size-4 shrink-0" />
            {prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}
