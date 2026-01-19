"use client";

import { Thread } from "@/components/assistant-ui/thread";
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
        className="absolute top-2 left-2 z-10 size-8 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Close AI Chat"
      >
        <PanelRightCloseIcon className="size-4" />
      </Button>
      <div className="min-h-0 flex-1">
        <Thread />
      </div>
    </div>
  );
}
