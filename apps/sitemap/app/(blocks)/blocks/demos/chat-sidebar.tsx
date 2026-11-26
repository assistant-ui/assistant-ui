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
  Search01Icon,
  SidebarLeftIcon,
  Tick02Icon,
  TimeQuarterPassIcon,
  Unarchive03Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Geist, Geist_Mono } from "next/font/google";
import { usePanelRef, type Layout } from "react-resizable-panels";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import "./chat-sidebar.css";

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
const rowAction = cn(
  iconButton,
  "absolute end-1 size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100",
);

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

/* A solid menu, since some open over pictures, with 28px rows. */
const popup =
  "bg-popover text-popover-foreground border-border/60 z-50 flex min-w-40 origin-(--transform-origin) flex-col rounded-(--radius) border p-1 text-[0.8125rem] leading-[1.125rem] shadow-(--float-shadow) outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none";

const popupItem =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex min-h-7 shrink-0 items-center gap-2 rounded-[calc(var(--radius)-4px)] px-2 py-1 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:min-h-9 [&_svg]:size-3.5 [&_svg]:shrink-0";

/* -------------------------------------------------------------------------- */
/* The look: the theme in chat-sidebar.css, and Geist for every demo on it     */
/* -------------------------------------------------------------------------- */

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

/* Menus and tooltips render in the body, so the fonts are set on the page too. */
const pageFonts = `:root:has(.chat-shell), body:has(.chat-shell) {
  --font-sans: ${geist.style.fontFamily}, ui-sans-serif, system-ui, sans-serif;
  --font-mono: ${geistMono.style.fontFamily}, ui-monospace, SFMono-Regular, Menlo, monospace;
}`;

/* -------------------------------------------------------------------------- */
/* ChatSidebar: the sidebar, and the page beside it                           */
/* -------------------------------------------------------------------------- */

type ChatHistory = ReturnType<typeof useChatHistory>;

type Frame = {
  /** Whether the sidebar is folded away, where there is room to show it. */
  hidden: boolean;
  /** Whether the sidebar and its list are on screen; a phone has no sidebar. */
  shown: boolean;
  toggle: () => void;
  /** Back and Forward through the chats opened, shared with the sidebar's own. */
  history: ChatHistory;
};

const FrameContext = createContext<Frame>({
  hidden: false,
  shown: false,
  toggle: () => {},
  history: {
    canGoBack: false,
    canGoForward: false,
    goBack: () => {},
    goForward: () => {},
  },
});

/** The sidebar's state, for a page header that stands in for it while it is not on screen. */
export function useChatFrame() {
  return useContext(FrameContext);
}

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
  historyNav,
  search,
  width = "15rem",
  defaultOpen = true,
  list,
  footer,
  children,
}: {
  title: string;
  /** Back and Forward through the chats opened, above the title. */
  history?: boolean;
  /**
   * Back and Forward through something other than chats, as `<HistoryNav>`.
   * Like `history`, it sits above the title.
   */
  historyNav?: ReactNode;
  /** A search button beside the title. The list filters itself by `query`. */
  search?: SidebarSearch;
  /** How wide the sidebar starts. */
  width?: string;
  /** Whether the sidebar starts open. */
  defaultOpen?: boolean;
  /** What the sidebar lists: `<ChatList>`, or a list of the block's own. */
  list: ReactNode;
  /** Stays at the foot of the sidebar, under the list. */
  footer?: ReactNode;
  /** The page: its header, which holds `<ChatSidebarTrigger>`, and the chat. */
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  // Held here, above the phone and desktop layouts, so switching between them keeps the chats opened.
  const chatHistory = useChatHistory();
  const sidebarRef = usePanelRef();
  const [open, setOpen] = useState(defaultOpen);
  const opened = useRef(defaultOpen);
  const snap = useSnapAnimation();

  const toggle = useCallback(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    if (!sidebar.isCollapsed()) sidebar.collapse();
    // A sidebar that started closed has no earlier width to open to.
    else if (opened.current) sidebar.expand();
    else sidebar.resize(width);
  }, [sidebarRef, width]);

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
  const shown = !isMobile && open;
  const frame = useMemo(
    () => ({ hidden, shown, toggle, history: chatHistory }),
    [hidden, shown, toggle, chatHistory],
  );

  return (
    <FrameContext.Provider value={frame}>
      <div
        className={cn(
          "chat-shell h-full font-sans antialiased",
          geist.variable,
          geistMono.variable,
        )}
      >
        <style>{pageFonts}</style>
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
                  defaultSize={defaultOpen ? width : 0}
                  minSize="12rem"
                  maxSize="24rem"
                  groupResizeBehavior="preserve-pixel-size"
                  onResize={(size) => {
                    if (size.inPixels > 0) opened.current = true;
                    setOpen(size.inPixels > 0);
                  }}
                  style={{ overflow: "hidden" }}
                >
                  <aside
                    aria-label={title}
                    inert={!open}
                    className="flex h-full min-w-48 flex-col"
                  >
                    <div className="flex h-12 shrink-0 items-center gap-0.5 px-2">
                      {historyNav ??
                        (history ? (
                          <HistoryNav {...chatHistory} />
                        ) : (
                          <TitleRow title={title} search={search} />
                        ))}
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
                      {(history || historyNav) &&
                        (search ? (
                          <div className="mb-1 flex h-8 shrink-0 items-center gap-0.5">
                            <TitleRow title={title} search={search} />
                          </div>
                        ) : (
                          <span
                            className={cn(
                              sidebarTitle,
                              "mb-1 flex h-8 shrink-0 items-center",
                            )}
                          >
                            {title}
                          </span>
                        ))}
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
      </div>
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

type SidebarSearch = {
  query: string;
  onQueryChange: (query: string) => void;
  /** What the field is for, such as "Search pages". */
  label: string;
};

/**
 * The sidebar's title, with a search button beside it when there is
 * `search`. The button turns the title into the field; Escape clears it.
 */
function TitleRow({
  title,
  search,
}: {
  title: string;
  search: SidebarSearch | undefined;
}) {
  const [searching, setSearching] = useState(false);
  if (!search) return <span className={sidebarTitle}>{title}</span>;

  const close = () => {
    search.onQueryChange("");
    setSearching(false);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5">
      {searching ? (
        <input
          autoFocus
          type="search"
          aria-label={search.label}
          placeholder={search.label}
          value={search.query}
          onChange={(event) => search.onQueryChange(event.target.value)}
          onBlur={() => {
            if (!search.query) setSearching(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            close();
          }}
          className={cn(
            "placeholder:text-muted-foreground h-8 min-w-0 flex-1 bg-transparent px-2 outline-none",
            rItem,
            focusRing,
          )}
        />
      ) : (
        <>
          <span className={sidebarTitle}>{title}</span>
          <Tip label={search.label}>
            <button
              type="button"
              onClick={() => setSearching(true)}
              className={cn(iconButton, "ms-auto")}
            >
              <Icon icon={Search01Icon} />
            </button>
          </Tip>
        </>
      )}
    </div>
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

/** Back and Forward, for `historyNav`: through whatever the block lists. */
export function HistoryNav({
  canGoBack,
  canGoForward,
  goBack,
  goForward,
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
}) {
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
  query = "",
}: {
  /** What a new chat is called: on the first row, and on a chat not yet named. */
  label: string;
  /** A line above the chats, shown once there is one. */
  heading?: string;
  /** Gives each chat a menu to archive or delete it, and lists the archived. */
  archive?: boolean;
  /** Shows only the chats whose names hold it, from `<ChatSidebar search>`. */
  query?: string;
}) {
  const wanted = query.trim().toLowerCase();
  const none = useAuiState(
    (s) =>
      wanted !== "" &&
      !s.threads.threadItems.some(
        (item) =>
          // Without `archive`, the list shows no archived chats, so they cannot count as a match.
          (archive || item.status !== "archived") &&
          (item.title || label).toLowerCase().includes(wanted),
      ),
  );

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
      {none && (
        <p className="text-muted-foreground px-2 pt-1">
          No chats match “{query.trim()}”.
        </p>
      )}
      <ThreadListPrimitive.Items>
        {() => <ChatRow label={label} archive={archive} wanted={wanted} />}
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
            {() => <ChatRow label={label} archive wanted={wanted} />}
          </ThreadListPrimitive.Items>
        </AuiIf>
      )}
    </ThreadListPrimitive.Root>
  );
}

function ChatRow({
  label,
  archive,
  wanted,
}: {
  label: string;
  archive: boolean;
  /** The search, lowercased. A chat whose name lacks it is left out. */
  wanted: string;
}) {
  const shown = useAuiState(
    (s) =>
      !wanted ||
      (s.threadListItem.title || label).toLowerCase().includes(wanted),
  );
  if (!shown) return null;

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

/* -------------------------------------------------------------------------- */
/* ChatHeader: the page's header, standing in for the sidebar while it is away */
/* -------------------------------------------------------------------------- */

/**
 * The page's header: the chat's name and a button to start a new one. While
 * the sidebar is not on screen (folded away, or on a phone, which has none) it
 * also takes over the sidebar's Back and Forward, its search, and its list of
 * chats. The search opens from Cmd+K or Ctrl+K either way.
 */
export function ChatHeader({
  newLabel,
  searchLabel,
}: {
  /** What a new chat is called, such as "New image". */
  newLabel: string;
  /** What the search is for, such as "Search images". */
  searchLabel: string;
}) {
  const title = useAuiState((s) => s.threadListItem.title);
  const empty = useAuiState((s) => s.thread.isEmpty);
  const { shown, history } = useChatFrame();

  return (
    <header className="flex h-12 shrink-0 items-center gap-0.5 px-3">
      <ChatSidebarTrigger />
      {!shown && <HistoryNav {...history} />}
      <p className="min-w-0 flex-1 truncate px-1.5 font-medium">
        {empty ? "" : title || newLabel}
      </p>
      <SearchCommand button={!shown} label={searchLabel} newLabel={newLabel} />
      {!shown && <HistoryMenu newLabel={newLabel} />}
      <Tip label={newLabel}>
        <ThreadListPrimitive.New className={iconButton}>
          <Icon icon={Add01Icon} />
        </ThreadListPrimitive.New>
      </Tip>
    </header>
  );
}

/** The chats the sidebar lists, in its order: not the one not yet started, not the archived. */
export function useChats() {
  const items = useAuiState((s) => s.threads.threadItems);
  const ids = useAuiState((s) => s.threads.threadIds);
  return useMemo(
    () => ids.flatMap((id) => items.filter((item) => item.id === id)),
    [items, ids],
  );
}

/* Each chat is found by its name; its id only keeps two chats of one name apart. */
const byName = (_value: string, search: string, keywords?: string[]) =>
  (keywords ?? []).some((name) =>
    name.toLowerCase().includes(search.trim().toLowerCase()),
  )
    ? 1
    : 0;

function SearchCommand({
  button,
  label,
  newLabel,
}: {
  button: boolean;
  label: string;
  newLabel: string;
}) {
  const aui = useAui();
  const chats = useChats();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return;
      if (event.key?.toLowerCase() !== "k") return;
      // Caught on the way down, so the site's own Cmd+K search does not open behind this one.
      event.preventDefault();
      event.stopPropagation();
      setOpen((wasOpen) => !wasOpen);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      {button && (
        <Tip label={label}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-keyshortcuts="Meta+K Control+K"
            className={iconButton}
          >
            <Icon icon={Search01Icon} />
          </button>
        </Tip>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden rounded-(--radius) p-0 sm:max-w-md"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              Find a chat by its name, or start a new one.
            </DialogDescription>
          </DialogHeader>
          <Command filter={byName} className="rounded-none bg-transparent">
            <CommandInput placeholder={label} />
            <CommandList className="p-1">
              <CommandEmpty>No chats match.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="new"
                  keywords={[newLabel]}
                  onSelect={() =>
                    run(() => void aui.threads().switchToNewThread())
                  }
                >
                  <Icon icon={Add01Icon} />
                  {newLabel}
                </CommandItem>
              </CommandGroup>
              {chats.length > 0 && (
                <CommandGroup heading="Recent">
                  {chats.map((chat) => (
                    <CommandItem
                      key={chat.id}
                      value={chat.id}
                      keywords={[chat.title || newLabel]}
                      onSelect={() =>
                        run(() => aui.threads().switchToThread(chat.id))
                      }
                    >
                      <span className="truncate">{chat.title || newLabel}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The chats as a menu, newest first, with the open one checked. */
function HistoryMenu({ newLabel }: { newLabel: string }) {
  const aui = useAui();
  const chats = useChats();
  const current = useAuiState((s) => s.threads.mainThreadId);

  return (
    <MenuPrimitive.Root>
      <Tip label="History">
        <MenuPrimitive.Trigger className={iconButton}>
          <Icon icon={TimeQuarterPassIcon} />
        </MenuPrimitive.Trigger>
      </Tip>
      <ShellMenuPopup align="end" className="max-h-80 w-64 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1">No chats yet</p>
        ) : (
          <>
            <p className="text-muted-foreground px-2 py-1">Recent</p>
            <MenuPrimitive.RadioGroup
              value={current}
              onValueChange={(id: string) => aui.threads().switchToThread(id)}
            >
              {chats.map((chat) => (
                <MenuPrimitive.RadioItem
                  key={chat.id}
                  value={chat.id}
                  closeOnClick
                  className={popupItem}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {chat.title || newLabel}
                  </span>
                  <MenuPrimitive.RadioItemIndicator className="ms-auto ps-3">
                    <Icon icon={Tick02Icon} />
                  </MenuPrimitive.RadioItemIndicator>
                </MenuPrimitive.RadioItem>
              ))}
            </MenuPrimitive.RadioGroup>
          </>
        )}
      </ShellMenuPopup>
    </MenuPrimitive.Root>
  );
}

function ShellMenuPopup({
  side = "bottom",
  align = "start",
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "side" | "align">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={6}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup className={cn(popup, className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/* -------------------------------------------------------------------------- */
/* SidebarUser: the person at the foot of the sidebar, with the demo's menu    */
/* -------------------------------------------------------------------------- */

/** The user row for the sidebar's `footer`: who is signed in, then a menu of the demo's own items. */
export function SidebarUser({
  detail,
  children,
}: {
  /** A line under the name, such as how many pictures were made. */
  detail: string;
  /** The menu's items: `<SidebarUserItem>` and `<SidebarUserSeparator>`. */
  children: ReactNode;
}) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={cn(
          "hover:bg-accent data-popup-open:bg-accent flex h-11 w-full items-center gap-2.5 px-2 text-start transition-colors motion-reduce:transition-none",
          rItem,
          focusRing,
        )}
      >
        <img
          src="/blocks/avatars/you.svg"
          alt=""
          className="size-7 shrink-0 rounded-full"
        />
        <span className="flex min-w-0 flex-1 flex-col leading-4">
          <span className="truncate font-medium">You</span>
          <span className="text-muted-foreground truncate text-xs">
            {detail}
          </span>
        </span>
        <Icon
          icon={UnfoldMoreIcon}
          className="text-muted-foreground size-4 shrink-0"
        />
      </MenuPrimitive.Trigger>
      <ShellMenuPopup side="top" className="w-(--anchor-width)">
        {children}
      </ShellMenuPopup>
    </MenuPrimitive.Root>
  );
}

export function SidebarUserItem({
  className,
  destructive = false,
  ...props
}: MenuPrimitive.Item.Props & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      className={cn(popupItem, destructive && menuItemDestructive, className)}
      {...props}
    />
  );
}

export function SidebarUserSeparator() {
  return (
    <MenuPrimitive.Separator className="bg-border mx-2 my-1 h-px shrink-0" />
  );
}

/** An icon drawn the way the shell draws its own, for menu items and buttons. */
export { Icon as ShellIcon };
