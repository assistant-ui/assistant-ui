"use client";

import { useAuiState } from "@assistant-ui/react";
import {
  BotMessageSquareIcon,
  CheckIcon,
  CircleAlertIcon,
  FileTextIcon,
  HistoryIcon,
  LoaderCircleIcon,
  MessageSquareIcon,
} from "lucide-react";
import { ApiKeys } from "@/components/api-keys";
import { ShareDialog } from "@/components/share-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useCommentsState,
  useDocumentState,
  useWorkspace,
  type PanelId,
} from "@/components/workspace-context";
import { initialDocument } from "@/lib/document-state";

/** Whether the document is saved, as a badge in the theme's own colors. */
function SaveStatus() {
  const [, { isPending, error }] = useDocumentState();
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return (
    <Badge
      role="status"
      variant={!isRunning && error ? "destructive" : "secondary"}
      className="max-sm:sr-only"
    >
      {isRunning ? (
        <span className="shimmer">Assistant is working</span>
      ) : error ? (
        <>
          <CircleAlertIcon />
          Not saved
        </>
      ) : isPending ? (
        <>
          <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />
          Saving
        </>
      ) : (
        <>
          <CheckIcon />
          Saved
        </>
      )}
    </Badge>
  );
}

export function DocumentHeader() {
  const [document, { setState }] = useDocumentState();
  const [{ comments }] = useCommentsState();
  const { panel, setPanel } = useWorkspace();
  const isRunning = useAuiState((s) => s.thread.isRunning);

  const openComments = comments.filter(
    (comment) => comment?.id && !comment.replyTo && !comment.resolved,
  ).length;

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
      <SaveStatus />
      <div className="ms-auto flex shrink-0 items-center gap-1.5">
        <Button
          variant={panel === "chat" ? "secondary" : "ghost"}
          aria-pressed={panel === "chat"}
          onClick={() => toggle("chat")}
        >
          <BotMessageSquareIcon data-icon="inline-start" />
          <span className="max-sm:sr-only">Chat</span>
        </Button>
        <Button
          variant={panel === "comments" ? "secondary" : "ghost"}
          aria-pressed={panel === "comments"}
          onClick={() => toggle("comments")}
        >
          <MessageSquareIcon data-icon="inline-start" />
          <span className="max-sm:sr-only">Comments</span>
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
          <span className="max-sm:sr-only">History</span>
        </Button>
        <ShareDialog />
        <ApiKeys />
      </div>
    </header>
  );
}
