"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  Add01Icon,
  Archive02Icon,
  ArrowDown02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Delete01Icon,
  LayoutAlignLeftIcon,
  MoreHorizontalIcon,
  SidebarLeftIcon,
  Unarchive03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { usePanelRef, type Layout } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Styles, on the scale of the block's own `block.css`                        */
/* -------------------------------------------------------------------------- */

function Icon({
  icon,
  className,
}: {
  icon: IconSvgElement;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={1.75}
      aria-hidden
      {...(className ? { className } : {})}
    />
  );
}

function Tip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

const focusRing =
  "outline-hidden focus-visible:ring-1 focus-visible:ring-foreground/20";

const rItem = "rounded-[calc(var(--radius)-4px)]";

const sidebarTitle = "min-w-0 truncate px-2 text-lg font-medium";

/* A row in a list: 32px tall, 8px side padding. */
const listRow = `hover:bg-accent flex h-8 items-center gap-2 px-2 transition-colors motion-reduce:transition-none ${rItem} ${focusRing}`;

const iconButton = `text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-3.5 ${focusRing}`;

/* The button at the end of a chat's row, shown while the row is in use. */
const rowAction = `${iconButton} absolute end-1 size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100`;

/*
 * A menu: a glass popup with the float shadow, 13px text and 26px rows (36px
 * on touch). The surface is solid where blur is unsupported or reduced
 * transparency is on.
 */
const menu =
  "text-popover-foreground border-border/60 z-50 flex min-w-40 origin-(--radix-dropdown-menu-content-transform-origin) flex-col rounded-(--radius) border bg-(--glass) p-1 text-[0.8125rem] leading-[1.125rem] font-[380] shadow-(--float-shadow) outline-none backdrop-blur-(--glass-blur) [--accent:var(--glass-hover)] [--muted-foreground:var(--glass-muted-foreground)] not-supports-[backdrop-filter:blur(1px)]:bg-popover data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-96 data-[state=open]:duration-150 data-[state=open]:ease-[cubic-bezier(0.2,0.7,0.2,1)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-96 data-[state=closed]:duration-100 data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100 [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

const menuItem =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex h-6.5 shrink-0 items-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:h-9 [&_svg]:size-3.5 [&_svg]:shrink-0";

const menuItemDestructive =
  "text-destructive data-highlighted:bg-destructive/5 data-highlighted:text-destructive";

/* -------------------------------------------------------------------------- */
/* ChatSidebar: the sidebar, and the page beside it                           */
/* -------------------------------------------------------------------------- */

type Frame = {
  /** Whether the sidebar is folded away, where there is room to show it. */
  hidden: boolean;
  toggle: () => void;
};

const FrameContext = createContext<Frame>({ hidden: false, toggle: () => {} });

/**
 * The sidebar opens and closes in one step, from the button, the shortcut or
 * a drag past its minimum width. This plays that step back as a 200ms slide.
 */
function useSnapAnimation() {
  const groupRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<Layout | null>(null);

  const onLayoutChange = useCallback((layout: Layout) => {
    const previous = layoutRef.current;
    layoutRef.current = layout;
    const group = groupRef.current;
    if (!previous || !group) return;

    const snapped = Object.keys(layout).some(
      (id) => (previous[id] ?? 0) > 0 !== (layout[id] ?? 0) > 0,
    );
    if (!snapped) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const id of Object.keys(layout)) {
      const panel = group.querySelector<HTMLElement>(`:scope > [id="${id}"]`);
      const from = previous[id];
      const to = layout[id];
      if (!panel || from === undefined || to === undefined) continue;
      for (const animation of panel.getAnimations()) animation.cancel();
      panel.animate([{ flexGrow: from }, { flexGrow: to }], {
        duration: 200,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      });
    }
  }, []);

  return { elementRef: groupRef, onLayoutChange };
}

/**
 * A sidebar beside the page: it resizes, and folds away from its own button,
 * from Cmd+B or Ctrl+B, or when dragged past its narrowest. A phone has no
 * room for it, so the page's header keeps the way to start something new.
 */
export function ChatSidebar({
  title,
  history = false,
  width = "15rem",
  list,
  footer,
  children,
}: {
  title: string;
  /** Back and Forward through the chats opened, above the title. */
  history?: boolean;
  /** How wide the sidebar starts. */
  width?: string;
  /** What the sidebar lists: `<ChatList>`, or a list of the block's own. */
  list: ReactNode;
  /** Stays at the foot of the sidebar, under the list. */
  footer?: ReactNode;
  /** The page: its header, which holds `<ChatSidebarTrigger>`, and the chat. */
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const sidebarRef = usePanelRef();
  const [open, setOpen] = useState(true);
  const snap = useSnapAnimation();

  const toggle = useCallback(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    if (sidebar.isCollapsed()) sidebar.expand();
    else sidebar.collapse();
  }, [sidebarRef]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return;
      if (event.key?.toLowerCase() !== "b") return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const hidden = !isMobile && !open;
  const frame = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);

  return (
    <FrameContext.Provider value={frame}>
      <TooltipProvider delay={300}>
        <ResizablePanelGroup
          {...snap}
          className="bg-background text-foreground text-sm"
        >
          {!isMobile && (
            <>
              <ResizablePanel
                id="sidebar"
                panelRef={sidebarRef}
                collapsible
                collapsedSize={0}
                defaultSize={width}
                minSize="12rem"
                maxSize="24rem"
                groupResizeBehavior="preserve-pixel-size"
                onResize={(size) => setOpen(size.inPixels > 0)}
                style={{ overflow: "hidden" }}
              >
                <aside
                  aria-label={title}
                  inert={!open}
                  className="flex h-full min-w-48 flex-col"
                >
                  <div className="flex h-12 shrink-0 items-center gap-0.5 px-2">
                    {history ? (
                      <HistoryButtons />
                    ) : (
                      <span className={sidebarTitle}>{title}</span>
                    )}
                    <Tip label="Hide the sidebar">
                      <button
                        type="button"
                        onClick={toggle}
                        className={cn(iconButton, "ms-auto")}
                      >
                        <Icon icon={SidebarLeftIcon} />
                      </button>
                    </Tip>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
                    {history && (
                      <span
                        className={cn(
                          sidebarTitle,
                          "mb-1 flex h-8 shrink-0 items-center",
                        )}
                      >
                        {title}
                      </span>
                    )}
                    {list}
                  </div>
                  {footer && <div className="shrink-0 p-2">{footer}</div>}
                </aside>
              </ResizablePanel>
              <ResizableHandle
                disabled={!open}
                // Hidden once the sidebar has finished sliding shut.
                className={
                  open
                    ? ""
                    : "pointer-events-none invisible transition-[visibility] delay-200 motion-reduce:delay-0"
                }
              />
            </>
          )}
          <ResizablePanel id="main" className="flex min-w-0 flex-col">
            {children}
          </ResizablePanel>
        </ResizablePanelGroup>
      </TooltipProvider>
    </FrameContext.Provider>
  );
}

/** The button that brings the sidebar back, for the start of the header. */
export function ChatSidebarTrigger() {
  const { hidden, toggle } = useContext(FrameContext);
  if (!hidden) return null;

  return (
    <Tip label="Show the sidebar">
      <button
        type="button"
        onClick={toggle}
        className={cn(iconButton, "-ms-1")}
      >
        <Icon icon={LayoutAlignLeftIcon} />
      </button>
    </Tip>
  );
}

/* -------------------------------------------------------------------------- */
/* History: back and forward through the chats you opened                     */
/* -------------------------------------------------------------------------- */

/** The chats opened in this session, in order, like a browser's history. */
function useChatHistory() {
  const aui = useAui();
  const current = useAuiState((s) => s.threads.mainThreadId);
  const known = useAuiState((s) =>
    [
      ...s.threads.threadIds,
      ...s.threads.archivedThreadIds,
      s.threads.newThreadId ?? "",
    ].join("\n"),
  );
  const [history, setHistory] = useState(() => ({
    entries: [current],
    index: 0,
  }));
  const pending = useRef<number | null>(null);

  useEffect(() => {
    const target = pending.current;
    pending.current = null;
    setHistory((previous) => {
      if (target !== null && previous.entries[target] === current)
        return { ...previous, index: target };
      if (previous.entries[previous.index] === current) return previous;
      return {
        entries: [...previous.entries.slice(0, previous.index + 1), current],
        index: previous.index + 1,
      };
    });
  }, [current]);

  // A deleted chat stays in the list and is stepped over.
  const ids = known.split("\n");
  const find = (step: -1 | 1) => {
    for (
      let index = history.index + step;
      index >= 0 && index < history.entries.length;
      index += step
    ) {
      const id = history.entries[index];
      if (id !== undefined && id !== current && ids.includes(id)) return index;
    }
    return null;
  };
  const go = (step: -1 | 1) => {
    const index = find(step);
    const id = index === null ? undefined : history.entries[index];
    if (index === null || id === undefined) return;
    pending.current = index;
    aui.threads().switchToThread(id);
  };

  return {
    canGoBack: find(-1) !== null,
    canGoForward: find(1) !== null,
    goBack: () => go(-1),
    goForward: () => go(1),
  };
}

function HistoryButtons() {
  const { canGoBack, canGoForward, goBack, goForward } = useChatHistory();

  return (
    <>
      <Tip label="Back">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={goBack}
          className={iconButton}
        >
          <Icon icon={ArrowLeft02Icon} className="rtl:rotate-180" />
        </button>
      </Tip>
      <Tip label="Forward">
        <button
          type="button"
          disabled={!canGoForward}
          onClick={goForward}
          className={iconButton}
        >
          <Icon icon={ArrowRight02Icon} className="rtl:rotate-180" />
        </button>
      </Tip>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatList: a row to start a chat, then the chats, newest first              */
/* -------------------------------------------------------------------------- */

/** The chats of the runtime, for the `list` of `<ChatSidebar>`. */
export function ChatList({
  label,
  heading,
  archive = false,
}: {
  /** What a new chat is called: on the first row, and on a chat not yet named. */
  label: string;
  /** A line above the chats, shown once there is one. */
  heading?: string;
  /** Gives each chat a menu to archive or delete it, and lists the archived. */
  archive?: boolean;
}) {
  return (
    <ThreadListPrimitive.Root className="flex flex-col gap-0.5">
      <ThreadListPrimitive.New
        className={cn(listRow, "data-active:bg-accent mb-1 font-medium")}
      >
        <Icon icon={Add01Icon} className="size-4" />
        {label}
      </ThreadListPrimitive.New>
      {heading && (
        <AuiIf condition={(s) => s.threads.threadIds.length > 0}>
          <p className="text-muted-foreground px-2 pt-1 pb-1">{heading}</p>
        </AuiIf>
      )}
      <ThreadListPrimitive.Items>
        {() => <ChatRow label={label} archive={archive} />}
      </ThreadListPrimitive.Items>
      <AuiIf condition={(s) => s.threads.hasMore}>
        <ThreadListPrimitive.LoadMore
          className={cn(
            listRow,
            "text-muted-foreground hover:text-foreground disabled:opacity-50",
          )}
        >
          <Icon icon={ArrowDown02Icon} className="size-4" />
          Show older chats
        </ThreadListPrimitive.LoadMore>
      </AuiIf>
      {archive && (
        <AuiIf condition={(s) => s.threads.archivedThreadIds.length > 0}>
          <p className="text-muted-foreground mt-4 px-2 pb-1 leading-5">
            Archived
          </p>
          <ThreadListPrimitive.Items archived>
            {() => <ChatRow label={label} archive />}
          </ThreadListPrimitive.Items>
        </AuiIf>
      )}
    </ThreadListPrimitive.Root>
  );
}

function ChatRow({ label, archive }: { label: string; archive: boolean }) {
  return (
    <ThreadListItemPrimitive.Root
      className={cn(
        "group hover:bg-accent data-active:bg-accent has-data-[state=open]:bg-accent relative flex h-8 items-center transition-colors motion-reduce:transition-none",
        rItem,
      )}
    >
      <ThreadListItemPrimitive.Trigger
        className={cn(
          "h-full min-w-0 flex-1 truncate ps-2 pe-8 text-start",
          rItem,
          focusRing,
        )}
      >
        <ThreadListItemPrimitive.Title fallback={label} />
      </ThreadListItemPrimitive.Trigger>
      {archive ? (
        <ChatMenu />
      ) : (
        <Tip label="Delete">
          <ThreadListItemPrimitive.Delete className={rowAction}>
            <Icon icon={Delete01Icon} />
          </ThreadListItemPrimitive.Delete>
        </Tip>
      )}
    </ThreadListItemPrimitive.Root>
  );
}

function ChatMenu() {
  const archived = useAuiState((s) => s.threadListItem.status === "archived");

  return (
    <ThreadListItemMorePrimitive.Root>
      <Tip label="Chat options">
        <ThreadListItemMorePrimitive.Trigger className={rowAction}>
          <Icon icon={MoreHorizontalIcon} />
        </ThreadListItemMorePrimitive.Trigger>
      </Tip>
      <ThreadListItemMorePrimitive.Content
        side="bottom"
        align="start"
        sideOffset={4}
        className={menu}
      >
        {archived ? (
          <ThreadListItemPrimitive.Unarchive asChild>
            <ThreadListItemMorePrimitive.Item className={menuItem}>
              <Icon icon={Unarchive03Icon} />
              Restore
            </ThreadListItemMorePrimitive.Item>
          </ThreadListItemPrimitive.Unarchive>
        ) : (
          <ThreadListItemPrimitive.Archive asChild>
            <ThreadListItemMorePrimitive.Item className={menuItem}>
              <Icon icon={Archive02Icon} />
              Archive
            </ThreadListItemMorePrimitive.Item>
          </ThreadListItemPrimitive.Archive>
        )}
        <ThreadListItemMorePrimitive.Separator className="bg-border mx-2 my-1 h-px shrink-0" />
        <ThreadListItemPrimitive.Delete asChild>
          <ThreadListItemMorePrimitive.Item
            className={cn(menuItem, menuItemDestructive)}
          >
            <Icon icon={Delete01Icon} />
            Delete
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Delete>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
}
