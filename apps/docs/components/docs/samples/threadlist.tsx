"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function ThreadListSample() {
  return (
    <SampleFrame className="h-100 overflow-hidden bg-muted/40 md:h-150">
      <div className="[&_[data-slot='sidebar-container']]:!absolute [&_[data-slot='sidebar-container']]:!h-full [&_[data-slot='sidebar-menu']]:!my-0 [&_[data-slot='sidebar-wrapper']]:!min-h-full [&_a]:!no-underline relative h-full [&_[data-slot='sidebar-footer']]:p-0 [&_[data-slot='sidebar-header']]:p-0 [&_[data-slot='sidebar-menu']]:pl-0 [&_[data-slot='sidebar-menu-item']]:list-none">
        <SidebarProvider defaultOpen={true} className="!min-h-full h-full">
          <ThreadListSidebar />
          <SidebarInset className="!m-0 h-full">
            <Thread />
          </SidebarInset>
        </SidebarProvider>
      </div>
    </SampleFrame>
  );
}
