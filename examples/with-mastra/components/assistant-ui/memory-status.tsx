"use client";

import * as React from "react";
import { useThreadRuntime } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { Database, MessageCircle, Clock } from "lucide-react";

export interface MemoryStatusProps {
  threadId?: string;
  showStats?: boolean;
  className?: string;
}

/**
 * MemoryStatus component displays Mastra memory system status.
 *
 * @example
 * ```tsx
 * import { MemoryStatus } from "@/components/assistant-ui/memory-status";
 *
 * <MemoryStatus showStats={true} />
 * ```
 */
export function MemoryStatus({
  threadId,
  showStats = false,
  className,
}: MemoryStatusProps) {
  const threadRuntime = useThreadRuntime();
  const state = threadRuntime.getState();
  const currentThreadId = threadId || "current";

  // Simple stats based on current thread state
  const messageCount = state.messages.length;
  const hasMemory = messageCount > 0;

  return (
    <div
      className={cn(
        "border-border bg-muted/50 rounded-lg border p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Database
          className="text-muted-foreground h-4 w-4"
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold">Memory Status</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              hasMemory
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                hasMemory ? "bg-green-600" : "bg-gray-400",
              )}
              aria-hidden="true"
            />
            {hasMemory ? "Active" : "Empty"}
          </span>
        </div>

        {showStats && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Messages
              </span>
              <span className="font-medium">{messageCount}</span>
            </div>

            {currentThreadId && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Thread ID
                </span>
                <span className="max-w-[120px] truncate font-mono text-xs">
                  {currentThreadId}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
