"use client";

import { useAuiState, useAui } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { getAssistantMessageTokenUsage } from "@/lib/assistant-metrics";
import { useSharedDocsModelSelection } from "./composer";
import { getContextWindow } from "@/constants/model";

function getUsageColorClass(percent: number): string {
  if (percent < 50) return "bg-emerald-500";
  if (percent < 80) return "bg-amber-500";
  return "bg-red-500";
}

export function AssistantFooter(): ReactNode {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);
  const messages = useAuiState((s) => s.thread.messages);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;
  const { modelValue } = useSharedDocsModelSelection();
  const contextWindow = getContextWindow(modelValue);

  const totalTokens = messages.reduce((acc, message) => {
    const usage = getAssistantMessageTokenUsage(message);
    return acc + (usage.totalTokens ?? 0);
  }, 0);

  const usagePercent = Math.min((totalTokens / contextWindow) * 100, 100);
  const usageK = (totalTokens / 1000).toFixed(1);

  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <button
        type="button"
        onClick={() => {
          const modelName = aui.thread().getModelContext()?.config?.modelName;
          analytics.assistant.newThreadClicked({
            threadId,
            previous_message_count: messages.length,
            context_total_tokens: totalTokens,
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

      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              getUsageColorClass(usagePercent),
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {usageK}k ({usagePercent.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}
