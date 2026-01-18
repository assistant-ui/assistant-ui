"use client";

import { SampleFrame } from "@/components/docs/samples/sample-frame";

function MainContent() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 p-4 max-md:border-b md:border-r">
      <div className="text-center text-muted-foreground">
        <p className="font-medium">Your App Content</p>
        <p className="text-sm">Main application area</p>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="flex w-full flex-col bg-background md:w-64">
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm">How can I help you today?</p>
          </div>
          <div className="ml-auto max-w-[80%] rounded-lg bg-primary p-3 text-primary-foreground">
            <p className="text-sm">Tell me about this feature</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm">
              The sidebar provides contextual assistance...
            </p>
          </div>
        </div>
      </div>
      <div className="border-t p-4">
        <div className="flex items-center rounded-lg border bg-background px-3 py-2">
          <span className="text-muted-foreground text-sm">
            Type a message...
          </span>
        </div>
      </div>
    </div>
  );
}

export function AssistantSidebarSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-background md:h-150">
      <div className="flex h-full flex-col md:flex-row">
        <MainContent />
        <Sidebar />
      </div>
    </SampleFrame>
  );
}
