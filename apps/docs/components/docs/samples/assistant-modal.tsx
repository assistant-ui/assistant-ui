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
    <SampleFrame className="h-125 bg-muted/40 md:h-160">
      <div ref={setContainer} className="contain-[layout] absolute inset-0">
        {container && <AssistantModal container={container} />}
      </div>
    </SampleFrame>
  );
}

export function AssistantModal({ container }: { container?: HTMLElement }) {
  return (
    <AssistantModalPrimitive.Root defaultOpen>
      <AssistantModalPrimitive.Anchor className="absolute right-4 bottom-4 size-11">
        <AssistantModalPrimitive.Trigger asChild>
          <AssistantModalButton />
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>
      <AssistantModalPrimitive.Content
        sideOffset={16}
        avoidCollisions={false}
        portalProps={{ container }}
        className="data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-1/2 data-[state=closed]:slide-out-to-right-1/2 data-[state=closed]:zoom-out data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-1/2 data-[state=open]:slide-in-from-right-1/2 data-[state=open]:zoom-in z-50 h-100 w-72 overflow-clip rounded-xl border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=open]:animate-in md:h-137.5 md:w-105 [&>.aui-thread-root]:bg-inherit [&>.aui-thread-root_.aui-thread-viewport-footer]:bg-inherit"
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
      className="size-full rounded-full shadow transition-transform hover:scale-110 active:scale-90"
      ref={ref}
    >
      <BotIcon
        data-state={state}
        className="absolute size-6 transition-all data-[state=closed]:rotate-0 data-[state=open]:rotate-90 data-[state=closed]:scale-100 data-[state=open]:scale-0"
      />
      <ChevronDownIcon
        data-state={state}
        className="absolute size-6 transition-all data-[state=closed]:-rotate-90 data-[state=open]:rotate-0 data-[state=closed]:scale-0 data-[state=open]:scale-100"
      />
      <span className="sr-only">{tooltip}</span>
    </TooltipIconButton>
  );
});
