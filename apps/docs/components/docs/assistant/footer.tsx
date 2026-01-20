"use client";

import { useAssistantState, useAssistantApi } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/lib/utils";

const CONTEXT_WINDOW = 400_000;

export const AssistantFooter: FC = () => {
  const api = useAssistantApi();
  const messages = useAssistantState(({ thread }) => thread.messages);

  const totalTokens = messages.reduce((acc, message) => {
    if (message.role !== "assistant") return acc;

    const metadata = message.metadata as any;
    const usage = metadata?.custom?.usage;
    if (usage) {
      const total =
        usage.totalTokens ??
        (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      if (total > 0) return acc + total;
    }

    const steps = metadata?.steps ?? [];
    return (
      acc +
      steps.reduce((stepAcc: number, step: any) => {
        const stepUsage = step.usage;
        if (!stepUsage) return stepAcc;
        return stepAcc + stepUsage.promptTokens + stepUsage.completionTokens;
      }, 0)
    );
  }, 0);

  const usagePercent = Math.min((totalTokens / CONTEXT_WINDOW) * 100, 100);
  const usageK = (totalTokens / 1000).toFixed(1);

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <button
        type="button"
        onClick={() => api.threads().switchToNewThread()}
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
              usagePercent < 50
                ? "bg-emerald-500"
                : usagePercent < 80
                  ? "bg-amber-500"
                  : "bg-red-500",
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
};
