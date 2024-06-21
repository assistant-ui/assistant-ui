"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";

import { Thread } from "@/components/ui/assistant-ui/thread";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { useState, forwardRef } from "react";

export const AssistantModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FloatingAssistantButton />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="h-[500px] w-[400px] rounded p-0"
      >
        <Thread />
      </PopoverContent>
    </Popover>
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
            className="hover:scale-70 absolute bottom-4 right-4 size-12 rounded-full shadow"
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
