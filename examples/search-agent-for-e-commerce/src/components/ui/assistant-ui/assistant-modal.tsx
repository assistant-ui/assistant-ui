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
import { useEffect, forwardRef, useState } from "react";

export const AssistantModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const height = open ? 770 : 70; // Set the height based on the modal state
    const width = open ? 720 : 70; // Set the width based on the modal state
    window.parent.postMessage(
      {
        type: "resize",
        height: height,
        width: width,
      },
      "*",
    );
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FloatingAssistantButton />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="fixed bottom-0 right-0 z-50 h-[700px] w-[700px] overflow-y-auto rounded-2xl p-0"
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-4 right-4 size-12 rounded-full shadow transition-transform hover:scale-110 active:scale-90"
          {...rest}
          ref={forwardedRef}
          style={{ zIndex: 1000 }}
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
  );
});

FloatingAssistantButton.displayName = "FloatingAssistantButton";
