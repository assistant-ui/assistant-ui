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
import { forwardRef, useState } from "react";

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

type FloatingAssistantButton = { "data-state"?: "open" | "closed" };

const FloatingAssistantButton = forwardRef<
  HTMLButtonElement,
  FloatingAssistantButton
>(({ "data-state": state, ...rest }, forwardedRef) => {
  const tooltip = state === "open" ? "Close Assistant" : "Open Assistant";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="absolute right-4 bottom-4 size-12 rounded-full shadow hover:scale-70"
            {...rest}
            ref={forwardedRef}
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
