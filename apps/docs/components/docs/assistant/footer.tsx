"use client";

import { useAuiState, useAui } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { analytics } from "@/lib/analytics";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { useThreadTokenUsage } from "@assistant-ui/react-ai-sdk";
import { ContextDisplay } from "@assistant-ui/ui/components/assistant-ui/context-display";
import { useSharedDocsModelSelection } from "./composer";
import { getContextWindow } from "@/constants/model";

type AssistantFooterProps = {
  onNewThread?: () => void;
  contextWindow?: number;
  centerContent?: ReactNode;
};

export function AssistantFooter(props: AssistantFooterProps = {}): ReactNode {
  if (props.contextWindow !== undefined) {
    return (
      <AssistantFooterContent {...props} contextWindow={props.contextWindow} />
    );
  }

  return <DefaultAssistantFooter {...props} />;
}

function DefaultAssistantFooter(props: AssistantFooterProps): ReactNode {
  const { modelValue } = useSharedDocsModelSelection();
  return (
    <AssistantFooterContent
      {...props}
      contextWindow={getContextWindow(modelValue)}
    />
  );
}

function AssistantFooterContent({
  onNewThread,
  contextWindow,
  centerContent,
}: AssistantFooterProps & { contextWindow: number }): ReactNode {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);
  const messages = useAuiState((s) => s.thread.messages);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;
  const lastUsage = useThreadTokenUsage();
  const contextTokens = lastUsage?.totalTokens ?? 0;
  const usagePercent = Math.min((contextTokens / contextWindow) * 100, 100);

  return (
    <div
      className={
        centerContent
          ? "grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5"
          : "flex items-center justify-between px-3 py-1.5"
      }
    >
      <button
        type="button"
        onClick={() => {
          const modelName = aui.thread().getModelContext()?.config?.modelName;
          analytics.assistant.newThreadClicked({
            threadId,
            previous_message_count: messages.length,
            context_total_tokens: contextTokens,
            context_usage_percent: usagePercent,
            ...(pathname ? { pathname } : {}),
            ...(modelName ? { model_name: modelName } : {}),
          });
          if (onNewThread) {
            onNewThread();
          } else {
            aui.threads().switchToNewThread();
          }
        }}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
      >
        <PlusIcon className="size-3.5" />
        <span>New thread</span>
      </button>

      {centerContent ? (
        <>
          <div className="min-w-0 px-1">{centerContent}</div>
          <div className="flex justify-end">
            <AssistantContextBar
              contextWindow={contextWindow}
              usage={lastUsage}
            />
          </div>
        </>
      ) : (
        <AssistantContextBar contextWindow={contextWindow} usage={lastUsage} />
      )}
    </div>
  );
}

function AssistantContextBar({
  contextWindow,
  usage,
}: {
  contextWindow: number;
  usage: ReturnType<typeof useThreadTokenUsage>;
}): ReactNode {
  return (
    <ContextDisplay.Bar modelContextWindow={contextWindow} usage={usage} />
  );
}
