"use client";

import {
  AuiIf,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  type ComponentType,
  Fragment,
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
import { typeEyebrow, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
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
    <div className="border-foreground/10 flex h-11 shrink-0 items-center justify-between border-b px-3.5">
      <span className="text-muted-foreground font-mono text-[11px] font-medium tracking-wide uppercase">
        assistant-ui · ask ai
      </span>
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
          className="text-muted-foreground hover:text-foreground flex h-7 items-center rounded-(--radius-control) px-2 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors"
        >
          new
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
          className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-(--radius-control) transition-colors"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

const GREETING_WORDS = ["Ask", "the", "library."];

const SUGGESTIONS = [
  "What is assistant-ui?",
  "How do I get started?",
  "How do I customize the styling?",
  "How do I connect my own backend?",
];

function AssistantWelcome(): React.ReactNode {
  return (
    <div className="flex flex-1 flex-col px-1.5 pb-2">
      <div className="flex flex-1 flex-col justify-end gap-2 pb-10">
        <p className={typeEyebrow}>For readers</p>
        <p className={typeSection}>
          {GREETING_WORDS.map((word, index) => (
            <Fragment key={index}>
              <span
                className="hero-word"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span
                  className="hero-word-ink"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  {word}
                </span>
              </span>{" "}
            </Fragment>
          ))}
          <span
            aria-hidden
            className="hero-caret ml-1 inline-block h-[0.72em] w-[3px] bg-blue-500 align-baseline"
            style={{ animationDelay: "180ms" }}
          />
        </p>
        <p
          className="text-muted-foreground hero-rise text-[13px] leading-relaxed"
          style={{ animationDelay: "500ms" }}
        >
          It reads the docs, then answers.
        </p>
      </div>
      <div className="flex flex-col">
        <p
          className={cn(typeEyebrow, "hero-rise mb-1")}
          style={{ animationDelay: "600ms" }}
        >
          Start with
        </p>
        {SUGGESTIONS.map((prompt, index) => (
          <ThreadPrimitive.Suggestion
            key={prompt}
            prompt={prompt}
            send
            className="group hover:bg-foreground/[0.025] hero-rise -mx-2 flex w-full items-baseline gap-2.5 px-2 py-2 text-left transition-colors"
            style={{ animationDelay: `${660 + index * 60}ms` }}
          >
            <span
              aria-hidden
              className="text-muted-foreground/50 font-mono text-[12px] transition-colors group-hover:text-blue-500"
            >
              {">"}
            </span>
            <span className="text-muted-foreground group-hover:text-foreground text-[13px] transition-colors">
              {prompt}
            </span>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}
