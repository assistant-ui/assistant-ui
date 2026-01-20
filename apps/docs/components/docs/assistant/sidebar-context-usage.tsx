"use client";

import { useAssistantState } from "@assistant-ui/react";
import type { FC } from "react";
import { cn } from "@/lib/utils";

const CONTEXT_WINDOW = 400_000;

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export const SidebarContextUsage: FC = () => {
  const messages = useAssistantState(({ thread }) => thread.messages);

  const totalTokens = messages.reduce((acc, message) => {
    const content = message.content
      .map((part) => {
        if (part.type === "text") return part.text;
        if (part.type === "tool-call") return JSON.stringify(part.args);
        return "";
      })
      .join(" ");
    return acc + estimateTokens(content);
  }, 0);

  const usagePercent = Math.min((totalTokens / CONTEXT_WINDOW) * 100, 100);
  const usageK = (totalTokens / 1000).toFixed(1);
  const maxK = (CONTEXT_WINDOW / 1000).toFixed(0);

  return (
    <div className="border-border/50 border-t px-3 py-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Context</span>
        <span>
          {usageK}k / {maxK}k
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
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
    </div>
  );
};
