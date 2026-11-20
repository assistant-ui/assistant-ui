"use client";

import { AssistantModal } from "./components/assistant-modal";
import { CommentThreads } from "./components/comments";
import { Editor } from "./components/editor";
import { TopBar } from "./components/top-bar";
import { TooltipProvider } from "./components/ui";
import { useDocumentStore } from "./lib/document";

/**
 * The page frame. The page scrolls inside it, and everything else floats
 * over the page: the pills at the top, the comment threads in the margin and
 * the assistant bar at the bottom. Each floating piece positions itself.
 */
export function DocumentEditor() {
  const commentsVisible = useDocumentStore((state) => state.commentsVisible);

  return (
    <TooltipProvider>
      <div
        data-comments={commentsVisible ? "visible" : "hidden"}
        className="bg-background text-foreground relative isolate h-full overflow-hidden"
      >
        <Editor />
        {/* The page fades out under the pills that float over its top edge. */}
        <div
          aria-hidden
          className="from-background via-background/80 pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-linear-to-b to-transparent"
        />
        <CommentThreads />
        <TopBar />
        <AssistantModal />
      </div>
    </TooltipProvider>
  );
}
