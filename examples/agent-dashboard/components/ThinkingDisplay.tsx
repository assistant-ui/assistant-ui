"use client";

import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentEvent } from "@assistant-ui/react-agent";

export interface ThinkingDisplayProps {
  events: AgentEvent[];
  className?: string;
}

interface ThinkingBlock {
  id: string;
  text: string;
  timestamp: Date;
}

export function ThinkingDisplay({ events, className }: ThinkingDisplayProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  const thinkingBlocks: ThinkingBlock[] = events
    .filter((e) => e.type === "reasoning")
    .map((e) => ({
      id: e.id,
      text: String((e.content as any).text || ""),
      timestamp: new Date(e.timestamp),
    }));

  if (thinkingBlocks.length === 0) {
    return null;
  }

  const toggleExpand = (id: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-purple-500/30 bg-purple-500/5",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-purple-500/20 border-b px-4 py-3">
        <Brain className="h-4 w-4 text-purple-500" />
        <h3 className="font-semibold text-purple-700 dark:text-purple-300">
          Extended Thinking
        </h3>
        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-purple-600 text-xs dark:text-purple-400">
          {thinkingBlocks.length}{" "}
          {thinkingBlocks.length === 1 ? "block" : "blocks"}
        </span>
      </div>

      <div className="divide-y divide-purple-500/10">
        {thinkingBlocks.map((block) => {
          const isExpanded = expandedBlocks.has(block.id);
          const preview = block.text.slice(0, 150);
          const hasMore = block.text.length > 150;

          return (
            <div key={block.id} className="group">
              <button
                type="button"
                onClick={() => toggleExpand(block.id)}
                className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-purple-500/5"
              >
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <span className="font-mono">
                      {formatTime(block.timestamp)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-sm leading-relaxed",
                      isExpanded ? "whitespace-pre-wrap" : "line-clamp-3",
                    )}
                  >
                    {isExpanded ? block.text : preview + (hasMore ? "..." : "")}
                  </p>
                </div>
                {hasMore && (
                  <span className="shrink-0 pt-1 text-purple-500">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
