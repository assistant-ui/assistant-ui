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

export function AssistantFooter(): ReactNode {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);
  const messages = useAuiState((s) => s.thread.messages);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;
  const { modelValue } = useSharedDocsModelSelection();
  const contextWindow = getContextWindow(modelValue);
  const lastUsage = useThreadTokenUsage();
  const contextTokens = lastUsage?.totalTokens ?? 0;
  const usagePercent = Math.min((contextTokens / contextWindow) * 100, 100);

  return (
    <div className="flex items-center justify-between px-3 py-1.5">
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
          aui.threads().switchToNewThread();
        }}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
      >
        <PlusIcon className="size-3.5" />
        <span>New thread</span>
      </button>

      <ContextDisplay.Bar
        modelContextWindow={contextWindow}
        usage={lastUsage}
      />
    </div>
  );
}
