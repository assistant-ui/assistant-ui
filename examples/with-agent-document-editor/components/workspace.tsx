"use client";

import { unstable_useInteractable } from "@assistant-ui/react";
import { XIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { ChatDock } from "@/components/chat/chat-dock";
import {
  CommentsEditMarker,
  DocumentEditMarker,
} from "@/components/chat/edit-marker";
import { DocumentHeader } from "@/components/document-header";
import { DocumentEditor } from "@/components/editor/document-editor";
import { CommentsPanel } from "@/components/panels/comments-panel";
import { HistoryPanel } from "@/components/panels/history-panel";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace-context";
import {
  COMMENTS_ID,
  COMMENTS_NAME,
  commentsDescription,
  commentsSchema,
  DOCUMENT_ID,
  DOCUMENT_NAME,
  documentDescription,
  documentSchema,
  initialComments,
  initialDocument,
} from "@/lib/document-state";

/**
 * Registers the two interactables for as long as the page is open. The model
 * loses `update_document` and `update_comments` when nothing has them
 * mounted, so they are registered here and not in a panel that can close.
 */
function Interactables() {
  unstable_useInteractable(DOCUMENT_NAME, {
    id: DOCUMENT_ID,
    description: documentDescription,
    stateSchema: documentSchema,
    initialState: initialDocument,
    updateRender: DocumentEditMarker,
  });
  unstable_useInteractable(COMMENTS_NAME, {
    id: COMMENTS_ID,
    description: commentsDescription,
    stateSchema: commentsSchema,
    initialState: initialComments,
    updateRender: CommentsEditMarker,
  });
  return null;
}

const PANEL_TITLE = { comments: "Comments", history: "History" };

function SidePanel() {
  const { panel, setPanel } = useWorkspace();
  if (!panel) return null;

  return (
    <aside
      aria-label={PANEL_TITLE[panel]}
      className="border-foreground/10 bg-background absolute inset-y-0 end-0 z-30 flex w-full max-w-sm flex-col border-s md:static md:z-0 md:w-80 md:shrink-0"
    >
      <div className="border-foreground/10 flex h-11 shrink-0 items-center justify-between border-b ps-4 pe-2">
        <h2 className="text-sm font-medium">{PANEL_TITLE[panel]}</h2>
        <TooltipIconButton
          tooltip="Close panel"
          side="left"
          onClick={() => setPanel(null)}
          className="text-muted-foreground size-7 [&_svg]:size-4"
        >
          <XIcon />
        </TooltipIconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {panel === "comments" ? <CommentsPanel /> : <HistoryPanel />}
      </div>
    </aside>
  );
}

export function Workspace() {
  return (
    <WorkspaceProvider>
      <Interactables />
      <div className="bg-background flex h-full flex-col">
        <DocumentHeader />
        <div className="relative flex min-h-0 flex-1">
          <main className="relative flex min-w-0 flex-1 flex-col">
            <DocumentEditor />
            <ChatDock />
          </main>
          <SidePanel />
        </div>
      </div>
    </WorkspaceProvider>
  );
}
