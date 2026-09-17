"use client";

import { forwardRef, useEffect, useId, useRef, useState, type FC } from "react";
import { BotIcon, ChevronDownIcon, HistoryIcon, PlusIcon } from "lucide-react";
import {
  AssistantModalPrimitive,
  ThreadListPrimitive,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import {
  ThreadListItems,
  ThreadListRoot,
  ThreadListSearch,
} from "@/components/assistant-ui/elements/thread-list.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { SampleFrame } from "./sample-frame";

export function AssistantModalSample() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <SampleFrame className="bg-muted/40 h-125 md:h-160">
      <div
        ref={setContainer}
        className="[container-type:size] absolute inset-0 contain-[layout]"
      >
        {container && <AssistantModal container={container} />}
      </div>
    </SampleFrame>
  );
}

type ModalView = "thread" | "list";

export function AssistantModal({ container }: { container?: HTMLElement }) {
  const [view, setView] = useState<ModalView>("thread");
  const titleId = useId();

  useAuiEvent("thread.runStart", () => setView("thread"));

  return (
    <AssistantModalPrimitive.Root
      defaultOpen
      onOpenChange={(open) => {
        if (open) setView("thread");
      }}
    >
      <AssistantModalPrimitive.Anchor className="absolute end-4 bottom-4 size-11">
        <AssistantModalPrimitive.Trigger asChild>
          <AssistantModalButton />
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>
      <AssistantModalPrimitive.Content
        sideOffset={16}
        avoidCollisions={false}
        portalProps={{ container }}
        aria-labelledby={titleId}
        className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 [&[data-state=open]_.aui-thread-viewport-footer]:animate-in [&[data-state=open]_.aui-thread-viewport-footer]:fade-in-0 [&[data-state=open]_.aui-thread-viewport-footer]:slide-in-from-bottom-2 [&[data-state=open]_.aui-thread-viewport-footer]:fill-mode-backwards [&_.aui-thread-viewport-footer]:bg-popover ring-foreground/10 z-50 flex h-100 max-h-[min(var(--radix-popover-content-available-height),calc(100cqh_-_5.75rem))] w-72 max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) flex-col overflow-clip rounded-xl p-0 antialiased shadow-[0_16px_48px_-24px_rgb(0_0_0/0.25)] ring-1 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-[state=closed]:duration-200 data-[state=open]:duration-300 motion-reduce:animate-none md:h-137.5 md:w-105 dark:shadow-[0_16px_48px_-24px_rgb(0_0_0/0.6)] [&_.aui-thread-root]:bg-inherit motion-reduce:[&_.aui-thread-viewport-footer]:animate-none [&_[data-slot=aui\_thread-viewport]]:[scrollbar-gutter:stable_both-edges] [&[data-state=open]_.aui-thread-viewport-footer]:delay-100 [&[data-state=open]_.aui-thread-viewport-footer]:duration-300 [&[data-state=open]_.aui-thread-viewport-footer]:ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        <AssistantModalHeader
          titleId={titleId}
          view={view}
          onViewChange={setView}
        />
        <div className="relative min-h-0 flex-1">
          <div className="h-full" inert={view === "list"}>
            <Thread />
          </div>
          {view === "list" && (
            <AssistantModalThreadList onSelect={() => setView("thread")} />
          )}
        </div>
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}

const AssistantModalHeader: FC<{
  titleId: string;
  view: ModalView;
  onViewChange: (view: ModalView) => void;
}> = ({ titleId, view, onViewChange }) => {
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
    <div className="border-foreground/10 flex h-11 shrink-0 items-center gap-2 border-b ps-3.5 pe-2">
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="min-w-0 flex-1 truncate text-[13px] font-medium outline-none"
      >
        {view === "list" ? "Threads" : title || "New Chat"}
      </h2>
      <div className="flex shrink-0 items-center gap-0.5">
        <TooltipIconButton
          tooltip="Threads"
          side="bottom"
          aria-pressed={view === "list"}
          disabled={!hasThreads && view === "thread"}
          className="text-muted-foreground hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground size-7 rounded-md p-0"
          onClick={() => onViewChange(view === "list" ? "thread" : "list")}
        >
          <HistoryIcon className="size-3.5" />
        </TooltipIconButton>
        <ThreadListPrimitive.New asChild>
          <TooltipIconButton
            tooltip="New Thread"
            side="bottom"
            className="text-muted-foreground hover:text-foreground size-7 rounded-md p-0"
            onClick={() => onViewChange("thread")}
          >
            <PlusIcon className="size-3.5" />
          </TooltipIconButton>
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
      className="bg-popover absolute inset-0 overflow-y-auto p-2"
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

type AssistantModalButtonProps = { "data-state"?: "open" | "closed" };

const AssistantModalButton = forwardRef<
  HTMLButtonElement,
  AssistantModalButtonProps
>(function AssistantModalButton({ "data-state": state, ...rest }, ref) {
  const tooltip = state === "open" ? "Close Assistant" : "Open Assistant";

  return (
    <TooltipIconButton
      variant="ghost"
      tooltip={tooltip}
      side="left"
      {...rest}
      className="bg-background text-foreground border-border/60 hover:border-border hover:bg-background size-full rounded-full border transition-[border-color,scale] duration-150 ease-out active:scale-96 motion-reduce:transition-none"
      ref={ref}
    >
      <BotIcon
        data-state={state}
        className="absolute size-5 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=closed]:scale-100 data-[state=closed]:opacity-100 data-[state=closed]:blur-[0px] data-[state=open]:scale-25 data-[state=open]:opacity-0 data-[state=open]:blur-[4px] motion-reduce:transition-none"
      />
      <ChevronDownIcon
        data-state={state}
        className="absolute size-5 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=closed]:scale-25 data-[state=closed]:opacity-0 data-[state=closed]:blur-[4px] data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=open]:blur-[0px] motion-reduce:transition-none"
      />
      <span className="sr-only">{tooltip}</span>
    </TooltipIconButton>
  );
});
