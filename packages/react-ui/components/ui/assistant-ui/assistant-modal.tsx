"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";

import { Thread } from "@/components/ui/assistant-ui/thread";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { FC, forwardRef } from "react";
import { AssistantModalPrimitive } from "@assistant-ui/react";

export const AssistantModal: FC = () => {
  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Trigger asChild>
        <FloatingAssistantButton />
      </AssistantModalPrimitive.Trigger>
      <AssistantModalPrimitive.Content
        sideOffset={16}
        className={
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 slide-in-from-bottom-2 bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in z-50 h-[500px] w-[400px] rounded-xl border p-0 shadow-md outline-none"
        }
      >
        <Thread />
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
};

type FloatingAssistantButtonProps = { "data-state"?: "open" | "closed" };

const FloatingAssistantButton = forwardRef<
  HTMLButtonElement,
  FloatingAssistantButtonProps
>(({ "data-state": state, ...rest }, ref) => {
  const tooltip = state === "open" ? "Close Assistant" : "Open Assistant";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            {...rest}
            className="fixed bottom-4 right-4 size-12 rounded-full shadow transition-transform hover:scale-110 active:scale-90"
            ref={ref}
          >
            <BotIcon
              className={cn(
                "absolute size-6 transition-all",
                state === "open" && "rotate-90 scale-0",
                state === "closed" && "rotate-0 scale-100",
              )}
            />

            <ChevronDownIcon
              className={cn(
                "absolute size-6 transition-all",
                state === "open" && "rotate-0 scale-100",
                state === "closed" && "-rotate-90 scale-0",
              )}
            />
            <span className="sr-only">{tooltip}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

FloatingAssistantButton.displayName = "FloatingAssistantButton";
