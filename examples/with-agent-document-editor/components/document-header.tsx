"use client";

import { useAuiState } from "@assistant-ui/react";
import { FileTextIcon, HistoryIcon, MessageSquareIcon } from "lucide-react";
import { ApiKeys } from "@/components/api-keys";
import { Button } from "@/components/ui/button";
import {
  useCommentsState,
  useDocumentState,
  useWorkspace,
  type PanelId,
} from "@/components/workspace-context";
import { initialDocument } from "@/lib/document-state";

export function DocumentHeader() {
  const [document, { setState, isPending, error }] = useDocumentState();
  const [{ comments }] = useCommentsState();
  const { panel, setPanel } = useWorkspace();
  const isRunning = useAuiState((s) => s.thread.isRunning);

  const openComments = comments.filter(
    (comment) => comment?.id && !comment.replyTo && !comment.resolved,
  ).length;
  const status = isRunning
    ? "Assistant is working"
    : error
      ? "Not saved"
      : isPending
        ? "Saving"
        : "Saved";

  const toggle = (id: PanelId) => setPanel(panel === id ? null : id);

  return (
    <header className="border-foreground/10 flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <FileTextIcon className="text-muted-foreground size-4 shrink-0" />
      <input
        value={document.title ?? ""}
        onChange={(event) =>
          setState((previous) => ({
            ...(previous ?? initialDocument),
            title: event.target.value,
          }))
        }
        placeholder="Untitled"
        aria-label="Document title"
        disabled={isRunning}
        className="placeholder:text-muted-foreground/70 focus-visible:ring-ring/50 -mx-1.5 h-8 min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 text-sm font-medium outline-none focus-visible:ring-1 sm:max-w-72 sm:flex-none"
      />
      <span
        role="status"
        className="text-muted-foreground hidden shrink-0 text-xs sm:inline"
      >
        {status}
      </span>
      <div className="ms-auto flex shrink-0 items-center gap-1.5">
        <Button
          variant={panel === "comments" ? "secondary" : "ghost"}
          aria-pressed={panel === "comments"}
          onClick={() => toggle("comments")}
        >
          <MessageSquareIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Comments</span>
          {openComments > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {openComments}
            </span>
          )}
        </Button>
        <Button
          variant={panel === "history" ? "secondary" : "ghost"}
          aria-pressed={panel === "history"}
          onClick={() => toggle("history")}
        >
          <HistoryIcon data-icon="inline-start" />
          <span className="hidden sm:inline">History</span>
        </Button>
        <ApiKeys />
      </div>
    </header>
  );
}
