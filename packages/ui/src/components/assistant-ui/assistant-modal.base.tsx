"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";

import {
  type ComponentPropsWithoutRef,
  type FC,
  forwardRef,
  useEffect,
  useState,
} from "react";
import { useAui } from "@assistant-ui/react";

import { Thread } from "@/components/assistant-ui/thread";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const AssistantModal: FC = () => {
  const [open, setOpen] = useState(false);
  const aui = useAui();

  useEffect(() => {
    return aui.on("thread.runStart", () => setOpen(true));
  }, [aui]);

  return (
    <Popover
      open={open}
      onOpenChange={(open, eventDetails) => {
        if (
          !open &&
          (eventDetails.reason === "outside-press" ||
            eventDetails.reason === "focus-out")
        ) {
          eventDetails.cancel();
        } else {
          setOpen(open);
        }
      }}
    >
      <div className="aui-root aui-modal-anchor fixed end-4 bottom-4 size-11">
        <PopoverTrigger
          render={(props, state) => (
            <AssistantModalButton {...props} open={state.open} />
          )}
        />
      </div>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={16}
        className="aui-root aui-modal-content bg-popover text-popover-foreground border-border/60 dark:border-muted-foreground/15 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-bottom-2 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:slide-out-to-bottom-2 [&[data-open]_.aui-thread-viewport-footer]:animate-in [&[data-open]_.aui-thread-viewport-footer]:fade-in-0 [&[data-open]_.aui-thread-viewport-footer]:slide-in-from-bottom-2 [&[data-open]_.aui-thread-viewport-footer]:fill-mode-backwards [&>.aui-thread-root_.aui-thread-viewport-footer]:bg-popover z-50 block h-125 max-h-(--available-height) w-100 max-w-[calc(100vw-2rem)] origin-(--transform-origin) overflow-clip overscroll-contain rounded-[2.5rem] border p-0 text-base antialiased shadow-xl ring-0 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-closed:duration-200 data-open:duration-300 motion-reduce:animate-none motion-reduce:[&_.aui-thread-viewport-footer]:animate-none [&_[data-slot=aui\_thread-viewport]]:[scrollbar-gutter:stable_both-edges] [&>.aui-thread-root]:bg-inherit [&[data-open]_.aui-thread-viewport-footer]:delay-100 [&[data-open]_.aui-thread-viewport-footer]:duration-300 [&[data-open]_.aui-thread-viewport-footer]:ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        <Thread />
      </PopoverContent>
    </Popover>
  );
};

type AssistantModalButtonProps = Omit<
  ComponentPropsWithoutRef<typeof TooltipIconButton>,
  "tooltip"
> & {
  open: boolean;
};

const AssistantModalButton = forwardRef<
  HTMLButtonElement,
  AssistantModalButtonProps
>(({ open, ...rest }, ref) => {
  const tooltip = open ? "Close Assistant" : "Open Assistant";

  return (
    <TooltipIconButton
      variant="default"
      tooltip={tooltip}
      side="left"
      {...rest}
      className="aui-modal-button size-full rounded-full shadow-lg transition-transform duration-150 ease-out hover:scale-105 active:scale-96 motion-reduce:transition-none"
      ref={ref}
    >
      <BotIcon
        data-open={open ? "" : undefined}
        data-closed={open ? undefined : ""}
        className="aui-modal-button-closed-icon absolute size-6 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-closed:scale-100 data-closed:opacity-100 data-closed:blur-[0px] data-open:scale-25 data-open:opacity-0 data-open:blur-[4px] motion-reduce:transition-none"
      />

      <ChevronDownIcon
        data-open={open ? "" : undefined}
        data-closed={open ? undefined : ""}
        className="aui-modal-button-open-icon absolute size-6 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-closed:scale-25 data-closed:opacity-0 data-closed:blur-[4px] data-open:scale-100 data-open:opacity-100 data-open:blur-[0px] motion-reduce:transition-none"
      />
      <span className="aui-sr-only sr-only">{tooltip}</span>
    </TooltipIconButton>
  );
});

AssistantModalButton.displayName = "AssistantModalButton";
