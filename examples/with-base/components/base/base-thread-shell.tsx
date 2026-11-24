"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import {
  Add01Icon,
  Album02Icon,
  Archive02Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  Calendar03Icon,
  CodeSquareIcon,
  ComponentIcon,
  DashboardCircleIcon,
  DashboardSquare01Icon,
  Delete01Icon,
  DollarCircleIcon,
  DragDropVerticalIcon,
  FavouriteCircleIcon,
  Folder01Icon,
  GitPullRequestIcon,
  Layers01Icon,
  MapsLocation01Icon,
  MoreHorizontalIcon,
  FilterMailIcon,
  PencilEdit02Icon,
  PinIcon,
  PreferenceHorizontalIcon,
  PuzzleIcon,
  Search01Icon,
  Sorting05Icon,
  Tick02Icon,
  TimeScheduleIcon,
  Unarchive03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Panels, usePanels } from "@/components/panels/panels";
import { usePins } from "@/lib/pins";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Pieces the shell and the thread both draw with                             */
/* -------------------------------------------------------------------------- */

export function Icon({
  icon,
  className,
}: {
  icon: IconSvgElement;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={1.6}
      aria-hidden
      {...(className ? { className } : {})}
    />
  );
}

export function Tip({
  label,
  side = "bottom",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export const focusRing =
  "outline-hidden focus-visible:ring-2 focus-visible:ring-primary/60";

/* A round-cornered icon button, 26px. */
export const iconButton = `text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground flex size-6.5 shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-4 ${focusRing}`;

/*
 * Menus: a raised panel with 12px corners and 4px of padding, and 28px rows
 * with 8px corners that hold an icon, a name, and a check or a chevron at the
 * end. Text is 13px.
 */
export const menu =
  "bg-popover text-popover-foreground border-border z-50 flex min-w-44 origin-(--transform-origin) flex-col rounded-xl border p-1 text-[0.8125rem] leading-5 shadow-[0_8px_24px_rgb(0_0_0/0.16)] outline-none transition-[opacity,scale] duration-100 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none";

export const menuItem =
  "data-highlighted:bg-accent data-popup-open:bg-accent relative flex min-h-7 shrink-0 items-center gap-2 rounded-lg px-2 py-1 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0";

export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export const MenuRadioGroup = MenuPrimitive.RadioGroup;
export const MenuSub = MenuPrimitive.SubmenuRoot;

export function MenuPopup({
  side = "bottom",
  align = "start",
  sideOffset = 6,
  alignOffset = 0,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup className={cn(menu, className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return <MenuPrimitive.Item className={cn(menuItem, className)} {...props} />;
}

/** One of a set of choices: the chosen one carries a check at the end. */
export function MenuChoice({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      closeOnClick
      className={cn(menuItem, className)}
      {...props}
    >
      {children}
      <MenuPrimitive.RadioItemIndicator className="ms-auto ps-3">
        <Icon icon={Tick02Icon} />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

/** A row that opens another menu beside it. */
export function MenuSubTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={cn(menuItem, className)}
      {...props}
    >
      {children}
      <Icon
        icon={ArrowRight01Icon}
        className="text-muted-foreground ms-auto rtl:rotate-180"
      />
    </MenuPrimitive.SubmenuTrigger>
  );
}

/** A menu whose rows narrow as its search field is typed in. */
export function SearchMenu(props: MenuPrimitive.Root.Props) {
  const [query, setQuery] = useState("");
  return (
    <MenuPrimitive.FilterProvider
      autoHighlight
      value={query}
      onValueChange={setQuery}
    >
      <MenuPrimitive.Root {...props} />
    </MenuPrimitive.FilterProvider>
  );
}

/** The same, for a menu that opens beside a row of another. */
export function SearchMenuSub(props: MenuPrimitive.SubmenuRoot.Props) {
  const [query, setQuery] = useState("");
  return (
    <MenuPrimitive.FilterProvider
      autoHighlight
      value={query}
      onValueChange={setQuery}
    >
      <MenuPrimitive.SubmenuRoot {...props} />
    </MenuPrimitive.FilterProvider>
  );
}

/** The rows a search field narrows, and the line shown when none are left. */
export function MenuList({ className, ...props }: MenuPrimitive.List.Props) {
  return (
    <MenuPrimitive.List
      className={cn("flex min-h-0 flex-col outline-none", className)}
      {...props}
    />
  );
}

export function MenuEmpty(props: MenuPrimitive.Empty.Props) {
  return (
    <MenuPrimitive.Empty
      className="text-muted-foreground px-2 py-1 empty:hidden"
      {...props}
    />
  );
}

/** A field at the top of a searchable menu. */
export function MenuSearch({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Input>) {
  return (
    <div className="border-border text-muted-foreground mx-1 mb-1 flex h-8 shrink-0 items-center gap-2 border-b px-1">
      <Icon icon={Search01Icon} className="size-4 shrink-0" />
      <MenuPrimitive.Input
        className={cn(
          "text-foreground placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent outline-none",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/** A row that turns something on or off, with a switch at its end. */
export function MenuSwitch({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      closeOnClick={false}
      className={cn(menuItem, "group/switch", className)}
      {...props}
    >
      {children}
      <span
        aria-hidden
        className="bg-foreground/20 group-data-checked/switch:bg-foreground ms-auto flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none"
      >
        <span className="bg-background size-3 rounded-full transition-transform group-data-checked/switch:translate-x-3 motion-reduce:transition-none" />
      </span>
    </MenuPrimitive.CheckboxItem>
  );
}

export function MenuLabel(props: ComponentProps<"p">) {
  return <p className="text-muted-foreground px-2 py-1" {...props} />;
}

export function MenuSeparator() {
  return (
    <MenuPrimitive.Separator className="bg-border mx-1 my-1 h-px shrink-0" />
  );
}

/* -------------------------------------------------------------------------- */
/* Shell: the sidebar of chats, and the thread beside it                      */
/* -------------------------------------------------------------------------- */

export type Project = { name: string; branches: readonly string[] };

/* Where a chat is shown. Every other path is a page of its own. */
export const CHAT_PATH = "/chat";

type Shell = {
  /** The projects the person has made. None are built in. */
  projects: readonly Project[];
  /** The project new chats work in, or none. */
  project: Project | null;
  setProject: (project: Project | null) => void;
  /** The branch of that project the work starts from. */
  branch: string | null;
  setBranch: (branch: string) => void;
  /** Whether the open chat is a temporary one. */
  temporary: boolean;
  /** The temporary chat, which the sidebar leaves out, or none. */
  temporaryId: string | null;
  /** Makes the open chat temporary, or an ordinary chat again. */
  setTemporary: (temporary: boolean) => void;
};

const ShellContext = createContext<Shell | null>(null);

export function useBaseShell() {
  const shell = useContext(ShellContext);
  if (!shell)
    throw new Error("useBaseShell must be used within <BaseThreadShell>.");
  return shell;
}

/* A row of the sidebar: 30px tall, 8px corners. */
export const row = `hover:bg-foreground/[0.06] flex h-7.5 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start transition-colors motion-reduce:transition-none ${focusRing}`;

const sectionLabel = "text-muted-foreground flex h-7.5 items-center gap-1 px-2";

function ChatRow({
  search,
  onChat,
  onOpen,
}: {
  search: string;
  /** Whether the chat page is showing, where the open chat is marked. */
  onChat: boolean;
  onOpen: () => void;
}) {
  const { temporaryId } = useBaseShell();
  const id = useAuiState((s) => s.threadListItem.id);
  const archived = useAuiState((s) => s.threadListItem.status === "archived");
  const title = useAuiState((s) => s.threadListItem.title ?? "");
  if (id === temporaryId) return null;
  if (search && !title.toLowerCase().includes(search.toLowerCase()))
    return null;

  return (
    <ThreadListItemPrimitive.Root
      className={cn(
        "group hover:bg-foreground/[0.06] has-data-[state=open]:bg-foreground/[0.06] relative flex h-7.5 items-center rounded-lg transition-colors motion-reduce:transition-none",
        onChat && "data-active:bg-foreground/[0.08]",
      )}
    >
      <ThreadListItemPrimitive.Trigger
        onClick={onOpen}
        className={cn(
          "h-full min-w-0 flex-1 truncate rounded-lg ps-2 pe-8 text-start",
          focusRing,
        )}
      >
        <ThreadListItemPrimitive.Title fallback="New chat" />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMorePrimitive.Root>
        <Tip label="Chat options">
          <ThreadListItemMorePrimitive.Trigger
            className={cn(
              iconButton,
              "absolute end-1 size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100",
            )}
          >
            <Icon icon={MoreHorizontalIcon} />
          </ThreadListItemMorePrimitive.Trigger>
        </Tip>
        <ThreadListItemMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
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
          <ThreadListItemPrimitive.Delete asChild>
            <ThreadListItemMorePrimitive.Item
              className={cn(menuItem, "text-destructive")}
            >
              <Icon icon={Delete01Icon} />
              Delete
            </ThreadListItemMorePrimitive.Item>
          </ThreadListItemPrimitive.Delete>
        </ThreadListItemMorePrimitive.Content>
      </ThreadListItemMorePrimitive.Root>
    </ThreadListItemPrimitive.Root>
  );
}

const SORT = [
  { value: "updated", label: "Last updated", icon: Calendar03Icon },
  { value: "manual", label: "Manual order", icon: DragDropVerticalIcon },
] as const;

/*
 * How the recent chats are ordered. The order is kept here, since the runtime
 * lists chats newest first either way.
 */
function OrganizeMenu() {
  const [sort, setSort] = useState<string>(SORT[0].value);

  return (
    <Menu>
      <Tip label="Organize the sidebar">
        <MenuTrigger className={cn(iconButton, "size-6")}>
          <Icon icon={PreferenceHorizontalIcon} />
        </MenuTrigger>
      </Tip>
      <MenuPopup align="start">
        <MenuSub>
          <MenuSubTrigger>
            <Icon icon={Sorting05Icon} />
            Sort by
          </MenuSubTrigger>
          <MenuPopup side="right" sideOffset={6} alignOffset={-4}>
            <MenuRadioGroup value={sort} onValueChange={setSort}>
              {SORT.map((choice) => (
                <MenuChoice key={choice.value} value={choice.value}>
                  <Icon icon={choice.icon} />
                  {choice.label}
                </MenuChoice>
              ))}
            </MenuRadioGroup>
          </MenuPopup>
        </MenuSub>
        <MenuSeparator />
        <MenuItem disabled>
          <Icon icon={Add01Icon} />
          New section
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

/*
 * A part of the sidebar that folds away under its label. `actions` sit at
 * the label's end and show while the section is hovered or holds the focus,
 * or while one of their menus is open; a touch screen always shows them.
 */
function Section({
  label,
  actions,
  children,
}: {
  label: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="group/section flex flex-col">
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            sectionLabel,
            "hover:text-foreground w-fit rounded-lg",
            focusRing,
          )}
        >
          {label}
          <Icon
            icon={ArrowRight01Icon}
            className={cn(
              "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
              open ? "rotate-90" : "rtl:rotate-180",
            )}
          />
        </button>
        {actions && (
          <div className="ms-auto flex items-center opacity-0 transition-opacity group-focus-within/section:opacity-100 group-hover/section:opacity-100 has-data-popup-open:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100">
            {actions}
          </div>
        )}
      </div>
      {open && <div className="flex flex-col gap-px">{children}</div>}
    </div>
  );
}

type History = {
  ids: readonly string[];
  index: number;
  /** Where a step back or forward is headed, until that chat opens. */
  pending: number | null;
};

/*
 * Back and forward through the chats opened here, the way a browser steps
 * through pages. A chat deleted since is stepped over. A step from another
 * page lands on the chat page.
 */
function ChatHistory() {
  const aui = useAui();
  const router = useRouter();
  const pathname = usePathname();
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const archivedThreadIds = useAuiState((s) => s.threads.archivedThreadIds);
  const newThreadId = useAuiState((s) => s.threads.newThreadId);
  const [history, setHistory] = useState<History>({
    ids: [mainThreadId],
    index: 0,
    pending: null,
  });

  if (history.ids[history.index] !== mainThreadId) {
    const { ids, index, pending } = history;
    setHistory(
      pending !== null && ids[pending] === mainThreadId
        ? { ids, index: pending, pending: null }
        : {
            ids: [...ids.slice(0, index + 1), mainThreadId],
            index: index + 1,
            pending: null,
          },
    );
  }

  const exists = (id: string) =>
    id === newThreadId ||
    threadIds.includes(id) ||
    archivedThreadIds.includes(id);

  const target = (direction: -1 | 1) => {
    for (
      let i = history.index + direction;
      i >= 0 && i < history.ids.length;
      i += direction
    ) {
      const id = history.ids[i];
      if (id !== undefined && exists(id)) return i;
    }
    return null;
  };

  const step = (direction: -1 | 1) => {
    const index = target(direction);
    const id = index === null ? undefined : history.ids[index];
    if (index === null || id === undefined) return;
    setHistory((current) => ({ ...current, pending: index }));
    aui.threads().switchToThread(id);
    if (pathname !== CHAT_PATH) router.push(CHAT_PATH);
  };

  const button = cn(
    buttonVariants({ variant: "ghost", size: "icon-sm" }),
    "[&_svg]:text-muted-foreground hover:[&_svg]:text-foreground rtl:[&_svg]:rotate-180",
  );

  return (
    <>
      <Tip label="Back">
        <button
          type="button"
          disabled={target(-1) === null}
          onClick={() => step(-1)}
          className={button}
        >
          <Icon icon={ArrowLeft02Icon} />
        </button>
      </Tip>
      <Tip label="Forward">
        <button
          type="button"
          disabled={target(1) === null}
          onClick={() => step(1)}
          className={button}
        >
          <Icon icon={ArrowRight02Icon} />
        </button>
      </Tip>
    </>
  );
}

/* The app's places, which the More menu and the home page both list. */
export const MORE = [
  {
    id: "projects",
    label: "Projects",
    icon: Folder01Icon,
    description: "A home for each piece of work.",
  },
  {
    id: "images",
    label: "Images",
    icon: Album02Icon,
    description: "Make and edit pictures.",
  },
  {
    id: "health",
    label: "Health",
    icon: FavouriteCircleIcon,
    description: "Make sense of your health data.",
  },
  {
    id: "finances",
    label: "Finances",
    icon: DollarCircleIcon,
    description: "Budgets, spending and accounts.",
  },
  {
    id: "sites",
    label: "Sites",
    icon: DashboardSquare01Icon,
    description: "Build web pages and publish them.",
  },
  {
    id: "maps",
    label: "Maps",
    icon: MapsLocation01Icon,
    description: "Find places and plan routes.",
  },
  {
    id: "code-review",
    label: "Code Review",
    icon: GitPullRequestIcon,
    description: "A second look at your pull requests.",
  },
  {
    id: "spaces",
    label: "Spaces",
    icon: Layers01Icon,
    description: "Rooms for working with other people.",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    icon: TimeScheduleIcon,
    description: "Tasks that run at a set time.",
  },
  {
    id: "plugins",
    label: "Plugins",
    icon: PuzzleIcon,
    description: "Extra tools your agent can use.",
  },
  {
    id: "artifacts",
    label: "Artifacts",
    icon: CodeSquareIcon,
    description: "Documents and code from your chats.",
  },
  {
    id: "apps",
    label: "Apps",
    icon: DashboardCircleIcon,
    description: "Small apps you make and run.",
  },
  {
    id: "components",
    label: "Components",
    icon: ComponentIcon,
    description: "The parts this app is built from.",
  },
] as const;

/* The rest of the app's places; a pin marks the ones pinned on the home page. */
function MoreMenu() {
  const pins = usePins();

  return (
    <Menu>
      <Tip label="More">
        <MenuTrigger className={iconButton}>
          <Icon icon={FilterMailIcon} />
        </MenuTrigger>
      </Tip>
      <MenuPopup align="end">
        {MORE.map((entry) => (
          <MenuItem key={entry.id}>
            <Icon icon={entry.icon} />
            {entry.label}
            {pins.has(entry.id) && (
              <span className="text-muted-foreground ms-auto ps-3">
                <Icon icon={PinIcon} />
                <span className="sr-only">, pinned</span>
              </span>
            )}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}

/* The app's name, which leads home. */
function HomeLink({ onNavigate }: { onNavigate: () => void }) {
  const home = usePathname() === "/";

  return (
    <Link
      href="/"
      aria-current={home ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "hover:bg-foreground/[0.06] me-auto flex h-8 min-w-0 items-center rounded-lg px-2 text-base font-medium tracking-tight transition-colors motion-reduce:transition-none",
        focusRing,
      )}
    >
      <span className="truncate">AgentBase</span>
    </Link>
  );
}

/* What the sidebar holds, beside the page and inside the sheet alike. */
function Chats({ footer }: { footer: ReactNode }) {
  const { closeSheet } = usePanels();
  const { setTemporary } = useBaseShell();
  const aui = useAui();
  const router = useRouter();
  const onChat = usePathname() === CHAT_PATH;
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");

  /* A chat opens on the chat page, and puts the sheet away on a phone. */
  const openChat = () => {
    closeSheet();
    if (!onChat) router.push(CHAT_PATH);
  };

  /* New chat on a temporary chat not yet begun starts an ordinary one. */
  const newChat = () => {
    if (aui.thread().getState().isEmpty) setTemporary(false);
    openChat();
  };

  return (
    <ThreadListPrimitive.Root className="flex min-h-full flex-col text-[0.8125rem] leading-5">
      <div className="flex h-10 shrink-0 items-center gap-0.5 px-2">
        <HomeLink onNavigate={closeSheet} />
        <Tip label="Search chats">
          <button
            type="button"
            aria-pressed={searching}
            onClick={() => {
              setSearching((value) => !value);
              setSearch("");
            }}
            className={cn(iconButton, searching && "bg-foreground/[0.07]")}
          >
            <Icon icon={Search01Icon} />
          </button>
        </Tip>
        <MoreMenu />
      </div>

      {searching && (
        <div className="px-2 pb-2">
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            data-slot="input"
            className="placeholder:text-muted-foreground h-8 w-full rounded-lg border px-2.5 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 px-2 pb-3">
        <ThreadListPrimitive.New
          onClick={newChat}
          className={cn(row, onChat && "data-active:bg-foreground/[0.08]")}
        >
          <Icon icon={PencilEdit02Icon} className="size-4 shrink-0" />
          <span className="truncate">New chat</span>
        </ThreadListPrimitive.New>

        <Section
          label="Recents"
          actions={
            <>
              <OrganizeMenu />
              <Tip label="New chat">
                <ThreadListPrimitive.New
                  onClick={newChat}
                  className={cn(iconButton, "size-6")}
                >
                  <Icon icon={PencilEdit02Icon} />
                </ThreadListPrimitive.New>
              </Tip>
            </>
          }
        >
          <ThreadListPrimitive.Items>
            {() => (
              <ChatRow search={search} onChat={onChat} onOpen={openChat} />
            )}
          </ThreadListPrimitive.Items>
          <AuiIf condition={(s) => s.threads.hasMore}>
            <ThreadListPrimitive.LoadMore
              className={cn(
                row,
                "text-muted-foreground hover:text-foreground disabled:opacity-50",
              )}
            >
              Show more
            </ThreadListPrimitive.LoadMore>
          </AuiIf>
        </Section>

        <AuiIf condition={(s) => s.threads.archivedThreadIds.length > 0}>
          <Section label="Archived">
            <ThreadListPrimitive.Items archived>
              {() => (
                <ChatRow search={search} onChat={onChat} onOpen={openChat} />
              )}
            </ThreadListPrimitive.Items>
          </Section>
        </AuiIf>
      </div>

      <div className="bg-background sticky bottom-0 px-2 pb-2">{footer}</div>
    </ThreadListPrimitive.Root>
  );
}

/**
 * The frame around a page: a sidebar of recent chats in a resizable panel
 * that folds away, which becomes a sheet where the window is narrow. Its
 * header holds the toggle and the chat history; `header` fills the page's
 * own, and `footer` sits at the foot of the sidebar.
 */
export function BaseThreadShell({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const [projects] = useState<readonly Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [branch, setBranch] = useState<string | null>(null);

  const aui = useAui();
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const [temporaryId, setTemporaryId] = useState<string | null>(null);

  /* A temporary chat is deleted once another chat is opened. */
  useAuiEvent(
    { scope: "*", event: "threadListItem.switchedAway" },
    ({ threadId }) => {
      if (threadId !== temporaryId) return;
      setTemporaryId(null);
      if (aui.threads().getState().threadIds.includes(threadId))
        void aui.threads().item({ id: threadId }).delete();
    },
  );

  const shell = useMemo<Shell>(
    () => ({
      projects,
      project,
      // A project opens on its first branch.
      setProject: (next) => {
        setProject(next);
        setBranch(next?.branches[0] ?? null);
      },
      branch,
      setBranch,
      temporary: temporaryId === mainThreadId,
      temporaryId,
      setTemporary: (temporary) =>
        setTemporaryId(temporary ? mainThreadId : null),
    }),
    [projects, project, branch, temporaryId, mainThreadId],
  );

  return (
    <ShellContext.Provider value={shell}>
      <Panels
        className="base-shell text-foreground h-full text-[0.8125rem] leading-5"
        headers={{ left: <ChatHistory />, main: header }}
        toggleAt={{ left: "start" }}
        left={<Chats footer={footer} />}
      >
        {children}
      </Panels>
    </ShellContext.Provider>
  );
}
