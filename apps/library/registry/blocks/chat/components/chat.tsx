"use client";

import { ThreadListPrimitive } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";

export type ChatProps = {
  title?: string;
  /** Focus the composer on mount. Off where the chat sits among other content. */
  autoFocus?: boolean;
};

/**
 * A full-height chat: a header with a new-chat button over the assistant-ui
 * thread. Render it inside an AssistantRuntimeProvider; the block brings no
 * runtime of its own, so it works with any backend.
 */
export function Chat({ title = "Chat", autoFocus = true }: ChatProps) {
  return (
    <div className="bg-background text-foreground flex h-full min-h-0 flex-col">
      <header className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h1 className="text-sm font-medium">{title}</h1>
        <ThreadListPrimitive.New asChild>
          <TooltipIconButton
            tooltip="New chat"
            variant="ghost"
            className="size-8"
          >
            <PlusIcon />
          </TooltipIconButton>
        </ThreadListPrimitive.New>
      </header>
      <div className="min-h-0 flex-1">
        <Thread autoFocus={autoFocus} />
      </div>
    </div>
  );
}
