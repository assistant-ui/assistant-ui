"use client";
import { Thread } from "../assistant-ui/thread";
import { ThreadListSidebar } from "../assistant-ui/threadlist-sidebar";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { SampleFrame } from "./sample-frame";

export const ThreadListSample = () => {
  return (
    <SampleFrame sampleText="Sample ThreadList" className="overflow-hidden">
      <div className="relative h-full [&_[data-slot='sidebar-container']]:!absolute [&_[data-slot='sidebar-container']]:!h-full [&_[data-slot='sidebar-footer']]:p-0 [&_[data-slot='sidebar-header']]:p-0 [&_[data-slot='sidebar-menu']]:!my-0 [&_[data-slot='sidebar-menu']]:pl-0 [&_[data-slot='sidebar-menu-item']]:list-none [&_[data-slot='sidebar-wrapper']]:!min-h-full [&_a]:!no-underline">
        <SidebarProvider defaultOpen={true} className="h-full !min-h-full">
          <ThreadListSidebar />
          <SidebarInset className="!m-0 h-full">
            <Thread />
          </SidebarInset>
        </SidebarProvider>
      </div>
    </SampleFrame>
  );
};
