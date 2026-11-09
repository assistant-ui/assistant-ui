"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { ThreadListSidebar } from "@/components/assistant-ui/elements/threadlist-sidebar.aui";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  THREAD_LIST_FIXTURES,
  ThreadListRuntime,
  type RemoteThreadMetadata,
} from "./thread-list";
import { defineStates } from "./types";

function SidebarFixture({
  threads,
  open = true,
}: {
  threads: readonly RemoteThreadMetadata[] | "loading";
  open?: boolean;
}) {
  return (
    <ThreadListRuntime threads={threads}>
      <div className="bg-muted/40 relative h-full min-h-100 w-full overflow-hidden md:min-h-150 [&_[data-slot='sidebar-container']]:!absolute [&_[data-slot='sidebar-container']]:!h-full [&_[data-slot='sidebar-footer']]:p-0 [&_[data-slot='sidebar-header']]:p-0 [&_[data-slot='sidebar-menu']]:!my-0 [&_[data-slot='sidebar-menu']]:ps-0 [&_[data-slot='sidebar-menu-item']]:list-none [&_[data-slot='sidebar-wrapper']]:!min-h-full [&_a]:!no-underline">
        <SidebarProvider defaultOpen={open} className="h-full !min-h-full">
          <ThreadListSidebar />
          <SidebarInset className="!m-0 h-full">
            <Thread autoFocus={false} />
          </SidebarInset>
        </SidebarProvider>
      </div>
    </ThreadListRuntime>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "loading",
    label: "Loading",
    note: "The thread list request has not returned, so the sidebar shows skeleton rows.",
    Component: () => <SidebarFixture threads="loading" />,
  },
  {
    key: "empty",
    label: "Empty",
    note: "No saved threads yet, so the sidebar holds only the new thread button.",
    Component: () => <SidebarFixture threads={THREAD_LIST_FIXTURES.empty} />,
  },
  {
    key: "grouped",
    label: "Grouped",
    note: "Saved threads sort by last activity under Today, Yesterday, and Earlier.",
    Component: () => <SidebarFixture threads={THREAD_LIST_FIXTURES.grouped} />,
  },
  {
    key: "long-content",
    label: "Long list",
    note: "Long titles truncate and a long history scrolls inside the sidebar.",
    Component: () => <SidebarFixture threads={THREAD_LIST_FIXTURES.long} />,
  },
  {
    key: "collapsed",
    label: "Collapsed",
    note: "The sidebar starts closed and the conversation takes the full width.",
    Component: () => (
      <SidebarFixture threads={THREAD_LIST_FIXTURES.grouped} open={false} />
    ),
  },
]);
