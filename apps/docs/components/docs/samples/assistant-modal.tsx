"use client";

import { forwardRef, useState } from "react";
import { BotIcon, ChevronDownIcon } from "lucide-react";
import { AssistantModalPrimitive } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { SampleFrame } from "./sample-frame";

export function AssistantModalSample() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <SampleFrame className="bg-muted/40 h-125 md:h-160">
      <div ref={setContainer} className="absolute inset-0 contain-[layout]">
        {container && <AssistantModal container={container} />}
      </div>
    </SampleFrame>
  );
}

export function AssistantModal({ container }: { container?: HTMLElement }) {
  return (
    <AssistantModalPrimitive.Root defaultOpen>
      <AssistantModalPrimitive.Anchor className="absolute end-4 bottom-4 size-11">
        <AssistantModalPrimitive.Trigger asChild>
          <AssistantModalButton />
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>
      <AssistantModalPrimitive.Content
        sideOffset={16}
        avoidCollisions={false}
        portalProps={{ container }}
        className="bg-popover text-popover-foreground border-border/60 dark:border-muted-foreground/15 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 [&[data-state=open]_.aui-thread-viewport-footer]:animate-in [&[data-state=open]_.aui-thread-viewport-footer]:fade-in-0 [&[data-state=open]_.aui-thread-viewport-footer]:slide-in-from-bottom-2 [&[data-state=open]_.aui-thread-viewport-footer]:fill-mode-backwards [&>.aui-thread-root_.aui-thread-viewport-footer]:bg-popover z-50 h-100 w-72 origin-(--radix-popover-content-transform-origin) overflow-clip rounded-[2.5rem] border antialiased shadow-xl ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-[state=closed]:duration-200 data-[state=open]:duration-300 motion-reduce:animate-none md:h-137.5 md:w-105 motion-reduce:[&_.aui-thread-viewport-footer]:animate-none [&>.aui-thread-root]:bg-inherit [&[data-state=open]_.aui-thread-viewport-footer]:delay-100 [&[data-state=open]_.aui-thread-viewport-footer]:duration-300 [&[data-state=open]_.aui-thread-viewport-footer]:ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        <Thread />
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}

type AssistantModalButtonProps = { "data-state"?: "open" | "closed" };

const AssistantModalButton = forwardRef<
  HTMLButtonElement,
  AssistantModalButtonProps
>(function AssistantModalButton({ "data-state": state, ...rest }, ref) {
  const tooltip = state === "open" ? "Close Assistant" : "Open Assistant";

  return (
    <TooltipIconButton
      variant="default"
      tooltip={tooltip}
      side="left"
      {...rest}
      className="size-full rounded-full shadow-lg transition-transform duration-150 ease-out hover:scale-105 active:scale-96 motion-reduce:transition-none"
      ref={ref}
    >
      <BotIcon
        data-state={state}
        className="absolute size-6 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=closed]:scale-100 data-[state=closed]:opacity-100 data-[state=closed]:blur-[0px] data-[state=open]:scale-25 data-[state=open]:opacity-0 data-[state=open]:blur-[4px] motion-reduce:transition-none"
      />
      <ChevronDownIcon
        data-state={state}
        className="absolute size-6 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=closed]:scale-25 data-[state=closed]:opacity-0 data-[state=closed]:blur-[4px] data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=open]:blur-[0px] motion-reduce:transition-none"
      />
      <span className="sr-only">{tooltip}</span>
    </TooltipIconButton>
  );
});
