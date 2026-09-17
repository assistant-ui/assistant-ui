"use client";

import { BotIcon, ChevronDownIcon, HistoryIcon, PlusIcon } from "lucide-react";

import {
  type ComponentPropsWithoutRef,
  type FC,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
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

type ModalView = "thread" | "list";

type ModalSize = { readonly width: number; readonly height: number };

type ResizeDrag = {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly direction: 1 | -1;
  last: ModalSize | null;
};

const SIZE_STORAGE_KEY = "aui-modal-size";
const MIN_SIZE: ModalSize = { width: 320, height: 400 };
// The trigger and its offsets sit below the modal, so the height leaves room for them.
const VIEWPORT_INSET: ModalSize = { width: 32, height: 96 };
const RESIZE_STEP = 16;

const clampSize = ({ width, height }: ModalSize): ModalSize => ({
  width: Math.round(
    Math.max(
      MIN_SIZE.width,
      Math.min(width, window.innerWidth - VIEWPORT_INSET.width),
    ),
  ),
  height: Math.round(
    Math.max(
      MIN_SIZE.height,
      Math.min(height, window.innerHeight - VIEWPORT_INSET.height),
    ),
  ),
});

const readStoredSize = (): ModalSize | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(SIZE_STORAGE_KEY) ?? "null",
    );
    if (typeof stored !== "object" || stored === null) return null;
    const { width, height } = stored as Record<string, unknown>;
    if (typeof width !== "number" || typeof height !== "number") return null;
    return clampSize({ width, height });
  } catch {
    return null;
  }
};

const storeSize = (size: ModalSize | null) => {
  try {
    if (size) {
      window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
    } else {
      window.localStorage.removeItem(SIZE_STORAGE_KEY);
    }
  } catch {
    // Without storage the size lasts until the page reloads.
  }
};

const isRtl = (element: Element) =>
  getComputedStyle(element).direction === "rtl";

const useModalSize = (contentRef: RefObject<HTMLDivElement | null>) => {
  const [size, setSize] = useState(readStoredSize);
  const dragRef = useRef<ResizeDrag | null>(null);

  const commitSize = (next: ModalSize | null) => {
    setSize(next);
    storeSize(next);
  };

  const sizeFromPointer = (
    drag: ResizeDrag,
    event: PointerEvent<HTMLElement>,
  ) =>
    clampSize({
      width: drag.width - (event.clientX - drag.x) * drag.direction,
      height: drag.height - (event.clientY - drag.y),
    });

  const takeDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return null;
    dragRef.current = null;
    return drag;
  };

  return {
    size,
    reset: () => {
      dragRef.current = null;
      commitSize(null);
    },
    handleProps: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        const content = contentRef.current;
        if (event.button !== 0 || !content) return;
        const rect = content.getBoundingClientRect();
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          width: rect.width,
          height: rect.height,
          direction: isRtl(content) ? -1 : 1,
          last: null,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (!drag.last && event.clientX === drag.x && event.clientY === drag.y)
          return;
        drag.last = sizeFromPointer(drag, event);
        setSize(drag.last);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const drag = takeDrag(event);
        if (!drag) return;
        if (drag.last || event.clientX !== drag.x || event.clientY !== drag.y) {
          commitSize(sizeFromPointer(drag, event));
        }
      },
      onPointerCancel: (event: PointerEvent<HTMLElement>) => {
        const drag = takeDrag(event);
        if (drag?.last) commitSize(drag.last);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        const content = contentRef.current;
        if (!content) return;
        const step = event.shiftKey ? RESIZE_STEP * 4 : RESIZE_STEP;
        const rtl = isRtl(content);
        const changes: Record<string, readonly [number, number]> = {
          ArrowUp: [0, step],
          ArrowDown: [0, -step],
          [rtl ? "ArrowRight" : "ArrowLeft"]: [step, 0],
          [rtl ? "ArrowLeft" : "ArrowRight"]: [-step, 0],
        };
        const change = changes[event.key];
        if (!change) return;
        event.preventDefault();
        const rect = content.getBoundingClientRect();
        commitSize(
          clampSize({
            width: rect.width + change[0],
            height: rect.height + change[1],
          }),
        );
      },
    },
  };
};

export const AssistantModal: FC = () => {
  const [view, setView] = useState<ModalView>("thread");
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { size, reset, handleProps } = useModalSize(contentRef);
  const thread = useMemo(() => <Thread />, []);

  useAuiEvent("thread.runStart", () => setView("thread"));

  return (
    <AssistantModalPrimitive.Root
      onOpenChange={(open) => {
        if (open) setView("thread");
      }}
    >
      <AssistantModalPrimitive.Anchor className="aui-root aui-modal-anchor fixed end-4 bottom-4 size-11">
        <AssistantModalPrimitive.Trigger asChild>
          <AssistantModalButton />
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>
      <AssistantModalPrimitive.Content
        ref={contentRef}
        sideOffset={16}
        aria-labelledby={titleId}
        style={size ?? undefined}
        className="group/modal aui-root aui-modal-content bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 [&[data-state=open]_.aui-thread-viewport-footer]:animate-in [&[data-state=open]_.aui-thread-viewport-footer]:fade-in-0 [&[data-state=open]_.aui-thread-viewport-footer]:slide-in-from-bottom-2 [&[data-state=open]_.aui-thread-viewport-footer]:fill-mode-backwards [&_.aui-thread-viewport-footer]:bg-popover ring-foreground/10 z-50 flex h-125 max-h-(--radix-popover-content-available-height) w-100 max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) flex-col overflow-clip overscroll-contain rounded-xl p-0 antialiased shadow-[0_16px_48px_-24px_rgb(0_0_0/0.25)] ring-1 transition-none ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-[state=closed]:duration-200 data-[state=open]:duration-300 motion-reduce:animate-none dark:shadow-[0_16px_48px_-24px_rgb(0_0_0/0.6)] [&_.aui-thread-root]:bg-inherit motion-reduce:[&_.aui-thread-viewport-footer]:animate-none [&_[data-slot=aui\_thread-viewport]]:[scrollbar-gutter:stable_both-edges] [&[data-state=open]_.aui-thread-viewport-footer]:delay-100 [&[data-state=open]_.aui-thread-viewport-footer]:duration-300 [&[data-state=open]_.aui-thread-viewport-footer]:ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        <AssistantModalResizeHandle {...handleProps} onDoubleClick={reset} />
        <AssistantModalHeader
          titleId={titleId}
          view={view}
          onViewChange={setView}
        />
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
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
};

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
    <div className="aui-modal-header border-foreground/10 flex h-11 shrink-0 items-center gap-2 border-b ps-3.5 pe-2">
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="aui-modal-title min-w-0 flex-1 truncate text-[13px] font-medium outline-none"
      >
        {view === "list" ? "Threads" : title || "New Chat"}
      </h2>
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
        <ThreadListPrimitive.New asChild>
          <TooltipIconButton
            tooltip="New Thread"
            side="bottom"
            className="aui-modal-new text-muted-foreground hover:text-foreground size-7 rounded-md p-0"
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

type AssistantModalButtonProps = { "data-state"?: "open" | "closed" };

const AssistantModalButton = forwardRef<
  HTMLButtonElement,
  AssistantModalButtonProps
>(({ "data-state": state, ...rest }, ref) => {
  const tooltip = state === "open" ? "Close Assistant" : "Open Assistant";

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
        data-state={state}
        className="aui-modal-button-closed-icon absolute size-5 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=closed]:scale-100 data-[state=closed]:opacity-100 data-[state=closed]:blur-[0px] data-[state=open]:scale-25 data-[state=open]:opacity-0 data-[state=open]:blur-[4px] motion-reduce:transition-none"
      />

      <ChevronDownIcon
        data-state={state}
        className="aui-modal-button-open-icon absolute size-5 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=closed]:scale-25 data-[state=closed]:opacity-0 data-[state=closed]:blur-[4px] data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=open]:blur-[0px] motion-reduce:transition-none"
      />
      <span className="aui-sr-only sr-only">{tooltip}</span>
    </TooltipIconButton>
  );
});

AssistantModalButton.displayName = "AssistantModalButton";
