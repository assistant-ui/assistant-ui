"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  Add01Icon,
  Archive02Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Delete01Icon,
  DragDropVerticalIcon,
  Folder01Icon,
  LeftToRightListBulletIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PreferenceHorizontalIcon,
  Search01Icon,
  SidebarLeftIcon,
  Sorting05Icon,
  Tick02Icon,
  Unarchive03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import data from "./data.json";

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

export type Project = (typeof data.projects)[number];

type Shell = {
  /** Whether the sidebar is showing beside the thread. */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  /** Opens the sidebar as a sheet, where there is no room beside the thread. */
  openSheet: () => void;
  /** The project new chats work in, or none. */
  project: Project | null;
  setProject: (project: Project | null) => void;
};

const ShellContext = createContext<Shell | null>(null);

export function useCodexShell() {
  const shell = useContext(ShellContext);
  if (!shell)
    throw new Error("useCodexShell must be used within <CodexThreadShell>.");
  return shell;
}

/* A row of the sidebar: 30px tall, 8px corners. */
const row = `hover:bg-foreground/[0.06] flex h-7.5 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start transition-colors motion-reduce:transition-none ${focusRing}`;

const sectionLabel = "text-muted-foreground flex h-7.5 items-center gap-1 px-2";

function ChatRow({ search }: { search: string }) {
  const archived = useAuiState((s) => s.threadListItem.status === "archived");
  const title = useAuiState((s) => s.threadListItem.title ?? "");
  if (search && !title.toLowerCase().includes(search.toLowerCase()))
    return null;

  return (
    <ThreadListItemPrimitive.Root className="group hover:bg-foreground/[0.06] data-active:bg-foreground/[0.08] has-data-[state=open]:bg-foreground/[0.06] relative flex h-7.5 items-center rounded-lg transition-colors motion-reduce:transition-none">
      <ThreadListItemPrimitive.Trigger
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

const ORGANIZE = [
  { value: "project", label: "By project", icon: Folder01Icon },
  { value: "list", label: "In one list", icon: LeftToRightListBulletIcon },
] as const;

const SORT = [
  { value: "updated", label: "Last updated", icon: Calendar03Icon },
  { value: "manual", label: "Manual order", icon: DragDropVerticalIcon },
] as const;

type Organize = (typeof ORGANIZE)[number]["value"];

/*
 * How the sidebar is laid out. Organizing by project shows the projects; the
 * order is kept here, since the runtime lists chats newest first either way.
 */
function OrganizeMenu({
  organize,
  onOrganizeChange,
}: {
  organize: Organize;
  onOrganizeChange: (value: Organize) => void;
}) {
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
            <Icon icon={SidebarLeftIcon} />
            Organize sidebar
          </MenuSubTrigger>
          <MenuPopup side="right" sideOffset={6} alignOffset={-4}>
            <MenuRadioGroup
              value={organize}
              onValueChange={(value) => onOrganizeChange(value as Organize)}
            >
              {ORGANIZE.map((choice) => (
                <MenuChoice key={choice.value} value={choice.value}>
                  <Icon icon={choice.icon} />
                  {choice.label}
                </MenuChoice>
              ))}
            </MenuRadioGroup>
          </MenuPopup>
        </MenuSub>
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

function Section({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col">
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
      {open && <div className="flex flex-col gap-px">{children}</div>}
    </div>
  );
}

/* What the sidebar holds, beside the thread and inside the sheet alike. */
function Chats({ onSidebarToggle }: { onSidebarToggle?: () => void }) {
  const { project, setProject } = useCodexShell();
  const [organize, setOrganize] = useState<Organize>("project");
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <ThreadListPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-0.5 ps-4 pe-2">
        <p className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
          Codex
        </p>
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
        {onSidebarToggle && (
          <Tip label="Hide the sidebar">
            <button
              type="button"
              onClick={onSidebarToggle}
              className={iconButton}
            >
              <Icon icon={SidebarLeftIcon} />
            </button>
          </Tip>
        )}
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
            className={cn(
              "bg-foreground/[0.06] placeholder:text-muted-foreground h-8 w-full rounded-lg px-2.5 [&::-webkit-search-cancel-button]:hidden",
              focusRing,
            )}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-3">
        <ThreadListPrimitive.New className={row}>
          <Icon icon={PencilEdit02Icon} className="size-4 shrink-0" />
          <span className="truncate">New chat</span>
        </ThreadListPrimitive.New>

        {organize === "project" && (
          <Section label="Projects">
            {data.projects.map((entry) => (
              <button
                key={entry.name}
                type="button"
                aria-pressed={project?.name === entry.name}
                onClick={() =>
                  setProject(project?.name === entry.name ? null : entry)
                }
                className={cn(
                  row,
                  project?.name === entry.name && "bg-foreground/[0.08]",
                )}
              >
                <Icon
                  icon={Folder01Icon}
                  className="text-muted-foreground size-4 shrink-0"
                />
                <span className="truncate">{entry.name}</span>
              </button>
            ))}
          </Section>
        )}

        <div className="flex flex-col">
          <div className="flex items-center">
            <p className={cn(sectionLabel, "flex-1")}>Recents</p>
            <OrganizeMenu organize={organize} onOrganizeChange={setOrganize} />
            <Tip label="New chat">
              <ThreadListPrimitive.New className={cn(iconButton, "size-6")}>
                <Icon icon={PencilEdit02Icon} />
              </ThreadListPrimitive.New>
            </Tip>
          </div>
          <div className="flex flex-col gap-px">
            <ThreadListPrimitive.Items>
              {() => <ChatRow search={search} />}
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
          </div>
        </div>

        <AuiIf condition={(s) => s.threads.archivedThreadIds.length > 0}>
          <Section label="Archived">
            <ThreadListPrimitive.Items archived>
              {() => <ChatRow search={search} />}
            </ThreadListPrimitive.Items>
          </Section>
        </AuiIf>
      </div>
    </ThreadListPrimitive.Root>
  );
}

/**
 * The frame around a Codex thread: a sidebar of projects and recent chats
 * that folds away, which becomes a sheet where the window is narrow.
 */
export function CodexThreadShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  const shell = useMemo<Shell>(
    () => ({
      sidebarOpen,
      toggleSidebar: () => setSidebarOpen((open) => !open),
      openSheet: () => setSheetOpen(true),
      project,
      setProject,
    }),
    [sidebarOpen, project],
  );

  /* Opening a chat from the sheet puts the sheet away. */
  const closeSheetAfterNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        '[data-slot="aui_thread-list-item-trigger"], [data-slot="aui_thread-list-new"]',
      )
    )
      setSheetOpen(false);
  };

  return (
    <ShellContext.Provider value={shell}>
      <div className="bg-background text-foreground flex h-full w-full overflow-hidden text-[0.8125rem] leading-5">
        <aside
          inert={!sidebarOpen}
          className={cn(
            "bg-sidebar border-border hidden h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex",
            sidebarOpen ? "w-60 border-e" : "w-0",
          )}
        >
          <div className="flex min-h-0 w-60 flex-1 flex-col">
            <Chats onSidebarToggle={shell.toggleSidebar} />
          </div>
        </aside>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="left"
            className="bg-sidebar flex w-72 flex-col gap-0 p-0 text-[0.8125rem] leading-5"
          >
            <SheetTitle className="sr-only">Chats</SheetTitle>
            <div
              className="flex min-h-0 flex-1 flex-col"
              onClick={closeSheetAfterNavigation}
            >
              <Chats />
            </div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </ShellContext.Provider>
  );
}
