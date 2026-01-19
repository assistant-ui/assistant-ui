"use client";

import { SidebarThread } from "@/components/docs/assistant/sidebar-thread";
import { Button } from "@/components/ui/button";
import { useChatPanel } from "@/components/docs/contexts/chat-panel";
import { PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";

export function AIChatPanel(): React.ReactNode {
  const { open, toggle } = useChatPanel();

  if (!open) {
    return (
      <div className="flex h-full flex-col items-center justify-center border-l bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="size-9"
          aria-label="Open AI Chat"
        >
          <PanelRightOpenIcon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group relative flex h-full flex-col border-l bg-background">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="absolute top-1/2 left-0 z-10 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-l bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        aria-label="Close AI Chat"
      >
        <PanelRightCloseIcon className="size-3" />
      </Button>
      <div className="min-h-0 flex-1">
        <SidebarThread />
      </div>
    </div>
  );
}
