"use client";

import { BotIcon, ChevronDownIcon, HistoryIcon, PlusIcon } from "lucide-react";

import {
  type ComponentPropsWithoutRef,
  type FC,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ThreadListPrimitive,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import {
  ThreadListItems,
  ThreadListRoot,
  ThreadListSearch,
} from "@/components/assistant-ui/elements/thread-list.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { type ModalView, useModalSize } from "../utils/modal-size";

export const AssistantModal: FC = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ModalView>("thread");
  const contentRef = useRef<HTMLDivElement>(null);
  const { size, reset, handleProps } = useModalSize(contentRef);
  const thread = useMemo(() => <Thread />, []);

  useAuiEvent("thread.runStart", () => {
    setView("thread");
    setOpen(true);
  });

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(open, eventDetails) => {
        if (
          !open &&
          (eventDetails.reason === "outside-press" ||
            eventDetails.reason === "focus-out")
        ) {
          eventDetails.cancel();
        } else {
          if (open) setView("thread");
          setOpen(open);
        }
      }}
    >
      <div className="aui-root aui-modal-anchor fixed end-4 bottom-4 size-11">
        <PopoverPrimitive.Trigger
          render={(props, state) => (
            <AssistantModalButton {...props} open={state.open} />
          )}
        />
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="top"
          align="end"
          sideOffset={16}
          positionMethod="fixed"
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            ref={contentRef}
            style={size ?? undefined}
            className="group/modal aui-root aui-modal-content bg-popover text-popover-foreground data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-bottom-2 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:slide-out-to-bottom-2 [&[data-open]_.aui-thread-viewport-footer]:animate-in [&[data-open]_.aui-thread-viewport-footer]:fade-in-0 [&[data-open]_.aui-thread-viewport-footer]:slide-in-from-bottom-2 [&[data-open]_.aui-thread-viewport-footer]:fill-mode-backwards [&_.aui-thread-viewport-footer]:bg-popover ring-foreground/10 z-50 flex h-125 max-h-(--available-height) w-100 max-w-[calc(100vw-2rem)] origin-(--transform-origin) flex-col gap-0 overflow-clip overscroll-contain rounded-xl p-0 text-base antialiased shadow-[0_16px_48px_-24px_rgb(0_0_0/0.25)] ring-1 transition-none ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-closed:duration-200 data-open:duration-300 motion-reduce:animate-none dark:shadow-[0_16px_48px_-24px_rgb(0_0_0/0.6)] [&_.aui-thread-root]:bg-inherit motion-reduce:[&_.aui-thread-viewport-footer]:animate-none [&_[data-slot=aui\_thread-viewport]]:[scrollbar-gutter:stable_both-edges] [&[data-open]_.aui-thread-viewport-footer]:delay-100 [&[data-open]_.aui-thread-viewport-footer]:duration-300 [&[data-open]_.aui-thread-viewport-footer]:ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            <AssistantModalResizeHandle
              {...handleProps}
              onDoubleClick={reset}
            />
            <AssistantModalHeader view={view} onViewChange={setView} />
            <div className="aui-modal-body relative min-h-0 flex-1">
              <div
                ref={(node) => {
                  if (node) node.inert = view === "list";
                }}
                className="aui-modal-thread h-full"
              >
                {thread}
              </div>
              {view === "list" && (
                <AssistantModalThreadList onSelect={() => setView("thread")} />
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};

const AssistantModalHeader: FC<{
  view: ModalView;
  onViewChange: (view: ModalView) => void;
}> = ({ view, onViewChange }) => {
  const title = useAuiState((s) => s.threadListItem.title);
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownViewRef = useRef(view);

  useEffect(() => {
    if (shownViewRef.current === view) return;
    shownViewRef.current = view;
    const heading = titleRef.current;
    const active = document.activeElement;
    if (
      active === document.body ||
      active === heading?.closest("[role='dialog']")
    ) {
      heading?.focus();
    }
  }, [view]);

  return (
    <div className="aui-modal-header border-foreground/10 flex h-11 shrink-0 items-center gap-2 border-b ps-3.5 pe-2">
      <PopoverPrimitive.Title
        ref={titleRef}
        tabIndex={-1}
        className="aui-modal-title min-w-0 flex-1 truncate text-[13px] font-medium outline-none"
      >
        {view === "list" ? "Threads" : title || "New Chat"}
      </PopoverPrimitive.Title>
      <div className="flex shrink-0 items-center gap-0.5">
        <TooltipIconButton
          tooltip="Threads"
          side="bottom"
          aria-pressed={view === "list"}
          disabled={!hasThreads && view === "thread"}
          className="aui-modal-threads text-muted-foreground hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground size-7 rounded-md p-0"
          onClick={() => onViewChange(view === "list" ? "thread" : "list")}
        >
          <HistoryIcon className="size-3.5" />
        </TooltipIconButton>
        <ThreadListPrimitive.New
          render={
            <TooltipIconButton
              tooltip="New Thread"
              side="bottom"
              className="aui-modal-new text-muted-foreground hover:text-foreground size-7 rounded-md p-0"
              onClick={() => onViewChange("thread")}
            />
          }
        >
          <PlusIcon className="size-3.5" />
        </ThreadListPrimitive.New>
      </div>
    </div>
  );
};

const AssistantModalThreadList: FC<{ onSelect: () => void }> = ({
  onSelect,
}) => {
  const [search, setSearch] = useState("");
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);

  return (
    <ThreadListRoot
      className="aui-modal-thread-list bg-popover absolute inset-0 overflow-y-auto p-2"
      onClick={(event) => {
        const target = event.target as Element;
        if (target.closest("[data-slot='aui_thread-list-item-trigger']")) {
          onSelect();
        }
      }}
    >
      {hasThreads && (
        <ThreadListSearch value={search} onValueChange={setSearch} />
      )}
      <ThreadListItems searchQuery={hasThreads ? search : ""} />
    </ThreadListRoot>
  );
};

const AssistantModalResizeHandle: FC<ComponentPropsWithoutRef<"button">> = (
  props,
) => {
  return (
    <button
      type="button"
      aria-label="Resize Assistant"
      className="aui-modal-resize-handle group-hover/modal:border-foreground/15 hover:border-foreground/40 focus-visible:border-ring absolute start-0 top-0 z-10 size-6 cursor-nwse-resize touch-none rounded-ss-xl border-s-2 border-t-2 border-transparent transition-colors outline-none [clip-path:polygon(0_0,100%_0,100%_6px,6px_6px,6px_100%,0_100%)] motion-reduce:transition-none rtl:cursor-nesw-resize rtl:[clip-path:polygon(0_0,100%_0,100%_100%,calc(100%_-_6px)_100%,calc(100%_-_6px)_6px,0_6px)]"
      {...props}
    />
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
      variant="ghost"
      tooltip={tooltip}
      side="left"
      {...rest}
      className="aui-modal-button bg-background text-foreground border-border/60 hover:border-border hover:bg-background size-full rounded-full border transition-[border-color,scale] duration-150 ease-out active:scale-96 motion-reduce:transition-none"
      ref={ref}
    >
      <BotIcon
        data-open={open ? "" : undefined}
        data-closed={open ? undefined : ""}
        className="aui-modal-button-closed-icon absolute size-5 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-closed:scale-100 data-closed:opacity-100 data-closed:blur-[0px] data-open:scale-25 data-open:opacity-0 data-open:blur-[4px] motion-reduce:transition-none"
      />

      <ChevronDownIcon
        data-open={open ? "" : undefined}
        data-closed={open ? undefined : ""}
        className="aui-modal-button-open-icon absolute size-5 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-closed:scale-25 data-closed:opacity-0 data-closed:blur-[4px] data-open:scale-100 data-open:opacity-100 data-open:blur-[0px] motion-reduce:transition-none"
      />
      <span className="aui-sr-only sr-only">{tooltip}</span>
    </TooltipIconButton>
  );
});

AssistantModalButton.displayName = "AssistantModalButton";
