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
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CommandInstructions } from "./commands";
import { MemoryView } from "./memory";
import { Sidebar } from "./sidebar";
import { menuContentClass, menuItemClass } from "./styles";
import { Thread } from "./thread";

export type DemoView = "thread" | "memory";

export function DemoShell({
  expanded = false,
  onToggleExpanded,
  view,
  onViewChange: setView,
}: {
  expanded?: boolean;
  onToggleExpanded?: (() => void) | undefined;
  view: DemoView;
  onViewChange: (view: DemoView) => void;
}): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useThreadShortcuts(rootRef);

  return (
    <div
      ref={rootRef}
      className="bg-background grid h-full grid-rows-[3rem_minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <CommandInstructions />
      <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] hidden h-12 items-center gap-2 border-r border-b px-4 md:flex">
        <span
          aria-hidden
          className="bg-foreground/80 block size-4 [mask-image:url(/favicon/icon.svg)] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]"
        />
        <span className="text-[13px] font-medium">assistant-ui</span>
      </div>
      <div className="border-foreground/10 flex h-12 min-w-0 items-center gap-2 border-b px-4 md:px-5">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open threads"
          className="text-muted-foreground hover:text-foreground rounded-control -ms-1.5 grid size-7 shrink-0 place-items-center transition-colors md:hidden"
        >
          <PanelLeftIcon className="size-4" />
        </button>
        <ThreadTitle view={view} />
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <DemoMenu view={view} onViewChange={setView} />
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
      <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] hidden min-h-0 flex-col overflow-hidden border-r p-3 md:flex">
        <Sidebar onNavigate={() => setView("thread")} />
      </div>
      <main
        className="min-h-0 min-w-0"
        style={{ ["--thread-max-width" as string]: "42rem" }}
      >
        {view === "memory" ? <MemoryView /> : <Thread />}
      </main>
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="bg-background w-72 overflow-hidden p-3 pt-12"
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

function useThreadShortcuts(rootRef: RefObject<HTMLDivElement | null>) {
  const aui = useAui();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        aui.threads.switchToNewThread();
        return;
      }
      if (event.shiftKey && event.key === "Escape") {
        event.preventDefault();
        root
          .querySelector<HTMLTextAreaElement>("[data-composer-input]")
          ?.focus();
      }
    };
    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [aui, rootRef]);
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
}: {
  view: DemoView;
  onViewChange: (view: DemoView) => void;
}): ReactNode {
  return (
    <Menu.Root>
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
          <Menu.Popup className={menuContentClass}>
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
