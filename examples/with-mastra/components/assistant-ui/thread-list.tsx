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
 *   onThreadSelect={(id) => console.log("Selected:", id)}
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
    <div className={cn("w-64 border-r border-border bg-muted/50 p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Conversations</h2>
      </div>

      <div className="space-y-1">
        {threads.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No conversations yet
          </div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread}
              onClick={() => onThreadSelect?.(thread)}
              className={cn(
                "w-full text-left rounded-lg p-3 transition-colors",
                "hover:bg-muted",
              )}
              aria-label={`Switch to thread ${thread}`}
            >
              <div className="flex items-start gap-2">
                <MessageCircle
                  className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    New Conversation
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {!showArchived && threads.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <button
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded flex items-center gap-2"
            onClick={() => {
              console.log("Show archived threads");
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