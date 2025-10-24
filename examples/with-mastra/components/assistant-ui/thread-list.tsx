"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Archive } from "lucide-react";

export interface ThreadListProps {
  onThreadSelect?: (threadId: string) => void;
  showArchived?: boolean;
  className?: string;
}

/**
 * ThreadList component for managing conversation threads.
 * Simplified implementation for demonstration purposes.
 *
 * @example
 * ```tsx
 * import { ThreadList } from "@/components/assistant-ui/thread-list";
 *
 * <ThreadList
 *   onThreadSelect={(id) => handleThreadSelect(id)}
 *   showArchived={false}
 * />
 * ```
 */
export function ThreadList({
  onThreadSelect,
  showArchived = false,
  className,
}: ThreadListProps) {
  // This is a simplified placeholder component
  // In a real implementation, this would integrate with thread management
  const threads: never[] = [];

  return (
    <div
      className={cn("border-border bg-muted/50 w-64 border-r p-4", className)}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversations</h2>
      </div>

      <div className="space-y-1">
        {threads.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
            No conversations yet
          </div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread}
              onClick={() => onThreadSelect?.(thread)}
              className={cn(
                "w-full rounded-lg p-3 text-left transition-colors",
                "hover:bg-muted",
              )}
              aria-label={`Switch to thread ${thread}`}
            >
              <div className="flex items-start gap-2">
                <MessageCircle
                  className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    New Conversation
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {!showArchived && threads.length > 0 && (
        <div className="border-border mt-4 border-t pt-4">
          <button
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded p-2 text-left text-sm transition-colors"
            onClick={() => {
              // Archive functionality would be implemented here
            }}
          >
            <Archive className="h-4 w-4" />
            View Archived
          </button>
        </div>
      )}
    </div>
  );
}
