"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";

import { type FC, forwardRef } from "react";
import { AssistantModalPrimitive } from "@assistant-ui/react";

import { Thread } from "@/components/assistant-ui/thread";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

export const AssistantModal: FC = () => {
  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Anchor className="aui-root aui-modal-anchor fixed end-4 bottom-4 size-11">
        <AssistantModalPrimitive.Trigger asChild>
          <AssistantModalButton />
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>
      <AssistantModalPrimitive.Content
        sideOffset={16}
        className="aui-root aui-modal-content bg-popover text-popover-foreground border-border/60 dark:border-muted-foreground/15 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 z-50 h-125 max-h-(--radix-popover-content-available-height) w-100 max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) overflow-clip overscroll-contain rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.1),0_32px_72px_-16px_rgba(0,0,0,0.16)] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-[state=closed]:duration-200 data-[state=open]:duration-300 motion-reduce:animate-none [&>.aui-thread-root]:bg-inherit [&>.aui-thread-root_.aui-thread-viewport-footer]:bg-inherit"
      >
        <Thread />
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
};

type AssistantModalButtonProps = { "data-state"?: "open" | "closed" };

const AssistantModalButton = forwardRef<
  HTMLButtonElement,
  AssistantModalButtonProps
>(({ "data-state": state, ...rest }, ref) => {
  const tooltip = state === "open" ? "Close Assistant" : "Open Assistant";

  return (
    <TooltipIconButton
      variant="default"
      tooltip={tooltip}
      side="left"
      {...rest}
      className="aui-modal-button size-full rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1),0_8px_24px_-4px_rgba(0,0,0,0.2)] transition-transform duration-150 ease-out hover:scale-105 active:scale-95 motion-reduce:transition-none"
      ref={ref}
    >
      <BotIcon
        data-state={state}
        className="aui-modal-button-closed-icon absolute size-6 transition-[scale,rotate,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:scale-100 data-[state=closed]:rotate-0 data-[state=closed]:opacity-100 data-[state=open]:scale-75 data-[state=open]:rotate-90 data-[state=open]:opacity-0 motion-reduce:transition-none"
      />

      <ChevronDownIcon
        data-state={state}
        className="aui-modal-button-open-icon absolute size-6 transition-[scale,rotate,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:scale-75 data-[state=closed]:-rotate-90 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:rotate-0 data-[state=open]:opacity-100 motion-reduce:transition-none"
      />
      <span className="aui-sr-only sr-only">{tooltip}</span>
    </TooltipIconButton>
  );
});

AssistantModalButton.displayName = "AssistantModalButton";
