"use client";

import type { CloudThread } from "assistant-cloud/ai-sdk";
import { cn } from "@/lib/utils";
import { Plus, Trash2, MessageSquare } from "lucide-react";

type ThreadListProps = {
  threads: CloudThread[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
};

export function ThreadList({
  threads,
  selectedId,
  onSelect,
  onDelete,
  isLoading,
}: ThreadListProps) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="p-3">
        <button
          onClick={() => onSelect(null)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-4 py-2 font-medium text-sidebar-foreground text-sm transition-colors hover:bg-sidebar-accent"
        >
          <Plus className="size-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && threads.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground text-sm">
            <MessageSquare className="size-6 opacity-40" />
            <p>No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => onSelect(thread.id)}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  selectedId === thread.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <span className="flex-1 truncate">
                  {thread.title || "New conversation"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(thread.id);
                  }}
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Delete thread"
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
