"use client";

import { useState } from "react";
import { ChatSidebar } from "../chat-sidebar";
import { AssistantModal } from "./components/assistant-modal";
import { CommentsPanel, CommentThreads } from "./components/comments";
import { Editor } from "./components/editor";
import { Home } from "./components/home";
import { Outline } from "./components/outline";
import { PageHistoryNav, PageList } from "./components/pages-menu";
import { TopBar } from "./components/top-bar";
import { User } from "./components/user";
import { TooltipProvider } from "./components/ui";
import { useDocumentStore } from "./lib/document";

/**
 * The sidebar of pages beside the page frame. The page scrolls inside the
 * frame, and everything else floats over the page: the pills at the top,
 * the outline at the left edge, the comment threads in the margin and the
 * assistant bar at the bottom. Each floating piece positions itself. The
 * home lies over the frame, which stays mounted so a page started there is
 * ready for the assistant to write in; the assistant bar sits over both.
 */
export function DocumentEditor() {
  const commentsVisible = useDocumentStore((state) => state.commentsVisible);
  const home = useDocumentStore((state) => state.home);
  const [query, setQuery] = useState("");

  return (
    <TooltipProvider>
      <ChatSidebar
        title="Pages"
        historyNav={<PageHistoryNav />}
        search={{ query, onQueryChange: setQuery, label: "Search pages" }}
        list={<PageList query={query} />}
        footer={<User />}
      >
        <div data-document-frame className="relative isolate h-full">
          <div
            data-comments={commentsVisible ? "visible" : "hidden"}
            inert={home}
            className="bg-background text-foreground relative isolate h-full overflow-hidden"
          >
            <Editor />
            {/* The page fades out under the pills that float over its top edge. */}
            <div
              aria-hidden
              className="from-background via-background/80 pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-linear-to-b to-transparent"
            />
            <Outline />
            <CommentThreads />
            <TopBar />
            <CommentsPanel />
          </div>
          {home ? <Home /> : null}
          {/* Outside the page's frame, so it stays in reach on the home. */}
          <AssistantModal />
        </div>
      </ChatSidebar>
    </TooltipProvider>
  );
}
