"use client";

import { ChevronDown, History } from "lucide-react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui-base/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useNormalizeInterruptedXuluxThreads,
  useXuluxStoredThreads,
} from "../runtime/xulux-local-storage";
import type { XuluxStoredThread } from "../runtime/types";

function formatUpdatedAt(updatedAt: number): string {
  const delta = Date.now() - updatedAt;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) return "Just now";
  if (delta < hour) return `${Math.max(1, Math.floor(delta / minute))}m ago`;
  if (delta < day) return `${Math.floor(delta / hour)}h ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(updatedAt));
}

function fallbackTitle(thread: XuluxStoredThread): string {
  return thread.title?.trim() || "New chat";
}

export function XuluxHistoryMenu({
  onRestoreThread,
  onNewChat,
}: {
  onRestoreThread: (thread: XuluxStoredThread) => void;
  onNewChat: () => void;
}) {
  useNormalizeInterruptedXuluxThreads();
  const threads = useXuluxStoredThreads().filter(
    (thread) => thread.status === "regular",
  );
  const aui = useAui();
  const currentRemoteId = useAuiState((state) => state.threadListItem.remoteId);
  const hasInterrupted = threads.some(
    (thread) => thread.custom.xuluxStatus === "interrupted",
  );

  const handleSelect = (thread: XuluxStoredThread) => {
    void Promise.resolve(aui.threads().switchToThread(thread.remoteId)).then(
      () => {
        onRestoreThread(thread);
      },
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative h-7 gap-1.5 px-2.5 text-xs"
          />
        }
      >
        <History className="size-3.5" />
        <span className="hidden md:inline">History</span>
        <ChevronDown className="size-3" />
        {hasInterrupted && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-500" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-64 overflow-y-auto"
      >
        <div className="text-muted-foreground px-2.5 py-1 text-xs font-medium">
          History
        </div>
        {threads.length === 0 ? (
          <div className="text-muted-foreground px-2.5 py-2 text-sm">
            No saved chats yet.
          </div>
        ) : (
          threads.map((thread) => {
            const status = thread.custom.xuluxStatus;
            const isCurrent = currentRemoteId === thread.remoteId;
            return (
              <DropdownMenuItem
                key={thread.remoteId}
                className="items-start px-2 py-1.5"
                onClick={() => handleSelect(thread)}
              >
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block truncate text-xs font-medium">
                    {fallbackTitle(thread)}
                  </span>
                  <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px] leading-none">
                    {formatUpdatedAt(thread.custom.updatedAt)}
                    {isCurrent && (
                      <span className="bg-muted text-muted-foreground rounded px-1 py-0.5 text-[10px] font-medium">
                        Current
                      </span>
                    )}
                    {status !== "idle" && (
                      <span
                        className={cn(
                          "rounded px-1 py-0.5 text-[10px] font-medium",
                          status === "interrupted"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {status === "interrupted" ? "Interrupted" : "Running"}
                      </span>
                    )}
                  </span>
                </span>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="px-2 py-1.5 text-xs" onClick={onNewChat}>
          New chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
