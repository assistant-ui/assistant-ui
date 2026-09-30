import { ThreadListSidebar } from "@assistant-ui/ui/components/assistant-ui/elements/threadlist-sidebar.aui.tsx";
import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import {
  SidebarInset,
  SidebarProvider,
} from "@assistant-ui/ui/components/ui/base/sidebar.tsx";
import { defineSections } from "../types";
import { SeededRuntime, type SeededThreadItem } from "../runtime";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

const THREADS: SeededThreadItem[] = [
  {
    id: "t-draft",
    title: "Draft restore across threads",
    lastMessageAt: hoursAgo(1),
  },
  {
    id: "t-bridge",
    title: "Tunnel fetch over postMessage",
    lastMessageAt: hoursAgo(5),
  },
  {
    id: "t-theme",
    title: "Map shadcn tokens to --vscode-*",
    lastMessageAt: hoursAgo(26),
  },
];

// The sidebar container is `position: fixed` for a full-page layout; as in the
// docs sample, it is made absolute so it stays inside the card.
const CONTAIN_SIDEBAR =
  "relative h-120 overflow-hidden [&_[data-slot='sidebar-container']]:!absolute [&_[data-slot='sidebar-container']]:!h-full [&_[data-slot='sidebar-wrapper']]:!min-h-full";

export default defineSections([
  {
    id: "threadlist-sidebar",
    title: "Thread list sidebar",
    category: "chat",
    notes:
      "threadlist-sidebar.aui.tsx beside the kit Thread in a SidebarProvider, over three seeded threads. The container is made absolute, as in the docs sample.",
    render: () => (
      <SeededRuntime threads={THREADS}>
        <div className={CONTAIN_SIDEBAR}>
          <SidebarProvider defaultOpen className="h-full !min-h-full">
            <ThreadListSidebar />
            <SidebarInset className="!m-0 h-full min-w-0">
              <Thread />
            </SidebarInset>
          </SidebarProvider>
        </div>
      </SeededRuntime>
    ),
  },
]);
