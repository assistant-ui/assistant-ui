"use client";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { AssistantIf, ComposerPrimitive } from "@assistant-ui/react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import type { FC } from "react";

export const SidebarComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex items-end gap-2 bg-background p-3">
      <ComposerPrimitive.Input
        placeholder="Ask a question..."
        className="field-sizing-content max-h-24 flex-1 resize-none rounded-xl bg-muted px-3 py-2 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        rows={1}
        autoFocus
      />
      <SidebarComposerAction />
    </ComposerPrimitive.Root>
  );
};

const SidebarComposerAction: FC = () => {
  return (
    <>
      <AssistantIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            side="top"
            type="submit"
            variant="default"
            className="size-9 shrink-0 rounded-xl"
          >
            <ArrowUpIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AssistantIf>

      <AssistantIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="size-9 shrink-0 rounded-xl"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AssistantIf>
    </>
  );
};
