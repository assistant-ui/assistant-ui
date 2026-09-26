"use client";

import { useAui, useAuiState } from "@assistant-ui/react";
import { Menu } from "@base-ui/react/menu";
import {
  Maximize2Icon,
  Minimize2Icon,
  MoreHorizontalIcon,
  NotebookTextIcon,
  PanelLeftIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ThreadRenameInput } from "./thread-rename-input";
import {
  threadCommands,
  getThreadShortcut,
  type ThreadCommand,
} from "./thread-shortcuts";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CommandInstructions } from "./commands";
import { MemoryView } from "./memory";
import { Sidebar } from "./sidebar";
import { menuContentClass, menuItemClass } from "./styles";
import { Thread } from "./thread";

export type DemoView = "thread" | "memory";

const SIDEBAR_REGION_ID = "aui-demo-sidebar";

export function DemoShell({
  expanded = false,
  onToggleExpanded,
  view,
  onViewChange: setView,
  sidebarCollapsed,
  onSidebarCollapsedChange: setSidebarCollapsed,
}: {
  expanded?: boolean;
  onToggleExpanded?: (() => void) | undefined;
  view: DemoView;
  onViewChange: (view: DemoView) => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
}): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const aui = useAui();
  const [renaming, setRenaming] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const pendingMobileRename = useRef<typeof renaming>(null);
  const onMobileSidebarOpenChange = (open: boolean) => {
    if (open) pendingMobileRename.current = null;
    setMobileSidebarOpen(open);
  };
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  if (renaming && renaming.id !== mainThreadId) setRenaming(null);
  const persisted = useAuiState((s) =>
    s.threads.threadItems.some(
      (item) => item.id === s.threads.mainThreadId && item.status !== "new",
    ),
  );
  const runCommand = (command: ThreadCommand) => {
    if (command === "sidebar") {
      if (window.matchMedia("(max-width: 767px)").matches)
        onMobileSidebarOpenChange(!mobileSidebarOpen);
      else setSidebarCollapsed(!sidebarCollapsed);
      return;
    }
    if (command === "composer") {
      setMobileSidebarOpen(false);
      setView("thread");
      requestAnimationFrame(() =>
        rootRef.current
          ?.querySelector<HTMLTextAreaElement>("[data-composer-input]")
          ?.focus(),
      );
      return;
    }
    const state = aui.threads.getState();
    const item = state.threadItems.find(
      (item) => item.id === state.mainThreadId,
    );
    if (command === "rename") {
      if (item && item.status !== "new") {
        const target = { id: item.id, title: item.title ?? "" };
        if (mobileSidebarOpen) {
          pendingMobileRename.current = target;
          setMobileSidebarOpen(false);
        } else setRenaming(target);
      }
      return;
    }
    void Promise.resolve()
      .then(() => {
        if (command === "new") {
          setMobileSidebarOpen(false);
          setView("thread");
          return aui.threads.switchToNewThread();
        }
        if (command === "previous" || command === "next") {
          const index = state.threadIds.indexOf(state.mainThreadId);
          const next =
            index < 0
              ? command === "next"
                ? 0
                : state.threadIds.length - 1
              : index + (command === "next" ? 1 : -1);
          const id = state.threadIds[next];
          if (id) {
            setMobileSidebarOpen(false);
            setView("thread");
            return aui.threads.switchToThread(id);
          }
          return;
        }
        if (!item || item.status === "new") return;
        const client = aui.threads.item({ id: item.id });
        if (command === "archive")
          return item.status === "archived"
            ? client.unarchive()
            : client.archive();
        if (command === "pin") {
          const { pinned, ...custom } = item.custom ?? {};
          return client.updateCustom(
            pinned === "true" ? custom : { ...custom, pinned: "true" },
          );
        }
      })
      .catch(() =>
        toast.error("Could not update the thread. Please try again."),
      );
  };

  return (
    <div
      ref={rootRef}
      onKeyDown={(event) => {
        const command = getThreadShortcut(event.nativeEvent);
        if (!command) return;
        event.preventDefault();
        runCommand(command);
      }}
      className={cn(
        "bg-background grid h-full grid-rows-[3rem_minmax(0,1fr)]",
        sidebarCollapsed
          ? "md:grid-cols-[minmax(0,1fr)]"
          : "md:grid-cols-[15rem_minmax(0,1fr)]",
      )}
    >
      <CommandInstructions />
      <div
        className={cn(
          "border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] hidden h-12 items-center gap-2 border-r border-b px-4",
          !sidebarCollapsed && "md:flex",
        )}
      >
        <span
          aria-hidden
          className="bg-foreground/80 block size-4 [mask-image:url(/favicon/icon.svg)] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]"
        />
        <span className="text-[13px] font-medium">assistant-ui</span>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(true)}
          aria-label="Collapse threads"
          aria-expanded
          aria-controls={SIDEBAR_REGION_ID}
          className="text-muted-foreground hover:text-foreground rounded-control ms-auto -me-1.5 grid size-7 shrink-0 place-items-center transition-colors"
        >
          <PanelLeftIcon className="size-4" />
        </button>
      </div>
      <div className="border-foreground/10 flex h-12 min-w-0 items-center gap-2 border-b px-4 md:px-5">
        <button
          type="button"
          onClick={() => onMobileSidebarOpenChange(true)}
          aria-label="Open threads"
          className="text-muted-foreground hover:text-foreground rounded-control -ms-1.5 grid size-7 shrink-0 place-items-center transition-colors md:hidden"
        >
          <PanelLeftIcon className="size-4" />
        </button>
        {/* The collapse control lives in the sidebar header, so bringing the
            sidebar back needs a control the sidebar does not own. */}
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Show threads"
            aria-expanded={false}
            aria-controls={SIDEBAR_REGION_ID}
            className="text-muted-foreground hover:text-foreground rounded-control -ms-1.5 hidden size-7 shrink-0 place-items-center transition-colors md:grid"
          >
            <PanelLeftIcon className="size-4" />
          </button>
        ) : null}
        {renaming && renaming.id === mainThreadId ? (
          <div className="max-w-sm min-w-0 flex-1">
            <ThreadRenameInput
              key={renaming.id}
              title={renaming.title}
              onRename={(title) =>
                aui.threads.item({ id: renaming.id }).rename(title)
              }
              onDone={(restoreFocus) => {
                setRenaming(null);
                if (restoreFocus)
                  rootRef.current
                    ?.querySelector<HTMLButtonElement>(
                      '[aria-label="Demo options"]',
                    )
                    ?.focus();
              }}
            />
          </div>
        ) : (
          <ThreadTitle view={view} />
        )}
        <div className="-me-1.5 ml-auto flex shrink-0 items-center gap-1.5">
          <DemoMenu
            view={view}
            onViewChange={setView}
            onCommand={runCommand}
            persisted={persisted}
          />
          {onToggleExpanded ? (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-label={expanded ? "Exit full screen" : "Full screen"}
              className="text-muted-foreground hover:text-foreground rounded-control grid size-7 place-items-center transition-colors"
            >
              {expanded ? (
                <Minimize2Icon className="size-3.5" />
              ) : (
                <Maximize2Icon className="size-3.5" />
              )}
            </button>
          ) : null}
        </div>
      </div>
      <div
        id={SIDEBAR_REGION_ID}
        className={cn(
          "border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] hidden min-h-0 flex-col overflow-hidden border-r p-3",
          !sidebarCollapsed && "md:flex",
        )}
      >
        <Sidebar onNavigate={() => setView("thread")} />
      </div>
      <main
        className="min-h-0 min-w-0"
        style={{ ["--thread-max-width" as string]: "42rem" }}
      >
        {view === "memory" ? <MemoryView /> : <Thread />}
      </main>
      <Sheet
        open={mobileSidebarOpen}
        onOpenChange={onMobileSidebarOpenChange}
        onOpenChangeComplete={(open) => {
          if (!open && pendingMobileRename.current)
            setRenaming(pendingMobileRename.current);
        }}
      >
        <SheetContent
          side="left"
          className="bg-background w-72 overflow-hidden p-3 pt-12"
          finalFocus={() => pendingMobileRename.current === null}
        >
          <SheetTitle className="sr-only">Threads</SheetTitle>
          <Sidebar
            onNavigate={() => {
              setMobileSidebarOpen(false);
              setView("thread");
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ThreadTitle({ view }: { view: DemoView }): ReactNode {
  const title = useAuiState(
    (s) =>
      s.threads.threadItems.find((t) => t.id === s.threads.mainThreadId)?.title,
  );

  return (
    <span className="min-w-0 truncate text-[13px] font-medium">
      {view === "memory" ? "Memory" : (title ?? "New chat")}
    </span>
  );
}

function DemoMenu({
  view,
  onViewChange,
  onCommand,
  persisted,
}: {
  view: DemoView;
  onViewChange: (view: DemoView) => void;
  onCommand: (command: ThreadCommand) => void;
  persisted: boolean;
}): ReactNode {
  const pendingCommand = useRef<ThreadCommand | null>(null);
  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) pendingCommand.current = null;
      }}
      onOpenChangeComplete={(open) => {
        if (open || !pendingCommand.current) return;
        onCommand(pendingCommand.current);
      }}
    >
      <Menu.Trigger
        aria-label="Demo options"
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground rounded-control data-[popup-open]:text-foreground grid size-7 place-items-center transition-colors"
          />
        }
      >
        <MoreHorizontalIcon className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="isolate z-50 outline-none"
          side="bottom"
          align="end"
          sideOffset={6}
        >
          <Menu.Popup
            className={menuContentClass}
            finalFocus={() =>
              pendingCommand.current !== "rename" &&
              pendingCommand.current !== "composer"
            }
          >
            {threadCommands.map((command) => (
              <Menu.Item
                key={command.id}
                className={cn(menuItemClass, "justify-between gap-6")}
                disabled={
                  !persisted &&
                  ["rename", "archive", "pin"].includes(command.id)
                }
                onClick={() => {
                  pendingCommand.current = command.id;
                }}
              >
                <span>{command.label}</span>
                <kbd className="text-muted-foreground font-mono text-[10px]">
                  {command.shortcut}
                </kbd>
              </Menu.Item>
            ))}
            <Menu.Separator className="bg-border my-1 h-px" />
            <Menu.Item
              className={menuItemClass}
              onClick={() =>
                onViewChange(view === "memory" ? "thread" : "memory")
              }
            >
              <NotebookTextIcon className="size-3.5" />
              {view === "memory" ? "Back to thread" : "Memory"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
