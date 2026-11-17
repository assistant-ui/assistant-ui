"use client";

import { unstable_useInteractable } from "@assistant-ui/react";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { ChatPanel, ChatsMenu, ChatTitles } from "@/components/chat/chat-panel";
import {
  CommentsEditMarker,
  DocumentEditMarker,
} from "@/components/chat/edit-marker";
import { DocumentHeader } from "@/components/document-header";
import { DocumentEditor } from "@/components/editor/document-editor";
import { CommentsPanel } from "@/components/panels/comments-panel";
import { HistoryPanel } from "@/components/panels/history-panel";
import { SharedDocument } from "@/components/share-dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  useIsNarrow,
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

const PANEL_TITLE = { chat: "Chat", comments: "Comments", history: "History" };

function SidePanel() {
  const { panel, setPanel } = useWorkspace();
  if (!panel) return null;

  return (
    <aside
      aria-label={PANEL_TITLE[panel]}
      // The panel is laid out at no width for a moment when it opens. Its
      // content keeps the panel's smallest width, so text measured then
      // (the composer sizes itself to its text) is measured at a real width.
      className="bg-background flex h-full min-w-72 flex-col"
    >
      <div className="border-foreground/10 flex h-11 shrink-0 items-center gap-0.5 border-b ps-4 pe-2">
        <h2 className="me-auto text-sm font-medium">{PANEL_TITLE[panel]}</h2>
        {panel === "chat" && <ChatsMenu />}
        <TooltipIconButton
          tooltip="Close panel"
          side="bottom"
          onClick={() => setPanel(null)}
          className="text-muted-foreground size-7 [&_svg]:size-4"
        >
          <XIcon />
        </TooltipIconButton>
      </div>
      {panel === "chat" ? (
        <ChatPanel />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {panel === "comments" ? <CommentsPanel /> : <HistoryPanel />}
        </div>
      )}
    </aside>
  );
}

const SIDE_PANEL = "side-panel";

/**
 * The document, with the open panel beside it behind a handle that resizes
 * the two. Where there is no room for both, the panel lies over the document.
 */
function Panels() {
  const { panel } = useWorkspace();
  const isNarrow = useIsNarrow();
  // The width the panel was last dragged to, for when it is opened again.
  const [sideSize, setSideSize] = useState("22rem");

  return (
    <div className="relative min-h-0 flex-1">
      <ResizablePanelGroup
        orientation="horizontal"
        onLayoutChanged={(layout, { isUserInteraction }) => {
          const size = layout[SIDE_PANEL];
          if (isUserInteraction && size !== undefined) setSideSize(`${size}%`);
        }}
      >
        <ResizablePanel id="document" minSize="40%">
          <main className="relative flex h-full min-w-0 flex-col">
            <DocumentEditor />
          </main>
        </ResizablePanel>
        {panel && !isNarrow && (
          <>
            <ResizableHandle className="bg-foreground/10" />
            <ResizablePanel
              id={SIDE_PANEL}
              defaultSize={sideSize}
              minSize="18rem"
              maxSize="60%"
              groupResizeBehavior="preserve-pixel-size"
            >
              <SidePanel />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      {panel && isNarrow && (
        <div className="border-foreground/10 absolute inset-y-0 end-0 z-30 w-full max-w-sm border-s">
          <SidePanel />
        </div>
      )}
    </div>
  );
}

export function Workspace() {
  return (
    <WorkspaceProvider>
      <Interactables />
      <ChatTitles />
      <SharedDocument />
      <div className="bg-background flex h-full flex-col">
        <DocumentHeader />
        <Panels />
      </div>
    </WorkspaceProvider>
  );
}
