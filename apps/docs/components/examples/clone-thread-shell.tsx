"use client";

import {
  ThreadList,
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
  ThreadListSearch,
} from "@/components/assistant-ui/thread-list";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuiState } from "@assistant-ui/react";
import { MenuIcon, PanelLeftIcon } from "lucide-react";
import { useState, type FC, type MouseEvent, type ReactNode } from "react";

type CloneThreadShellProps = {
  children: ReactNode;
  railClassName?: string | undefined;
};

export const CloneThreadShell: FC<CloneThreadShellProps> = ({
  children,
  railClassName,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);

  const closeMobileSidebarAfterNavigation = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (!(event.target instanceof Element)) return;
    if (
      event.target.closest(
        '[data-slot="aui_thread-list-item-trigger"], [data-slot="aui_thread-list-new"]',
      )
    ) {
      setMobileSidebarOpen(false);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <aside
        className={cn(
          "bg-muted/30 hidden h-full shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 md:flex",
          railClassName,
          sidebarCollapsed ? "w-12" : "w-65",
        )}
      >
        <div className="flex h-12 shrink-0 items-center px-2">
          <TooltipIconButton
            variant="ghost"
            size="icon"
            tooltip={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            side="right"
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="size-8"
          >
            <PanelLeftIcon className="size-4" />
          </TooltipIconButton>
          {!sidebarCollapsed && (
            <span className="ml-2 truncate text-sm font-medium">Chats</span>
          )}
        </div>

        <ThreadListRoot
          className={cn(
            "relative flex-1 transition-[padding,width] duration-200",
            sidebarCollapsed
              ? "w-12 overflow-hidden px-2 pt-1"
              : "w-65 overflow-y-auto p-3",
          )}
        >
          <ThreadListNew
            className={cn(
              "overflow-hidden transition-all duration-200",
              sidebarCollapsed
                ? "w-8 gap-0 px-2 has-[>svg]:px-2"
                : "w-full gap-2 px-2.5 has-[>svg]:px-2.5",
            )}
            labelClassName={cn(
              "overflow-hidden transition-all duration-200",
              sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-24 opacity-100",
            )}
          />
          {hasThreads && (
            <div
              aria-hidden={sidebarCollapsed}
              inert={sidebarCollapsed}
              className={cn(
                "transition-opacity duration-150",
                sidebarCollapsed && "pointer-events-none opacity-0",
              )}
            >
              <ThreadListSearch value={search} onValueChange={setSearch} />
            </div>
          )}
          <ThreadListItems
            searchQuery={hasThreads ? search : ""}
            aria-hidden={sidebarCollapsed}
            inert={sidebarCollapsed}
            className={cn(
              "transition-[opacity,transform] duration-150",
              sidebarCollapsed
                ? "pointer-events-none opacity-0"
                : "translate-x-0 opacity-100",
            )}
          />
        </ThreadListRoot>
      </aside>

      <div className="absolute top-2 left-2 z-20 md:hidden">
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/70 size-8 backdrop-blur-sm"
              >
                <MenuIcon className="size-4" />
                <span className="sr-only">Open chat history</span>
              </Button>
            }
          />
          <SheetContent side="left" className="flex flex-col p-0">
            <SheetTitle className="flex h-12 shrink-0 items-center px-4 text-sm font-medium">
              Chats
            </SheetTitle>
            <div
              className="relative flex-1 overflow-y-auto p-3"
              onClick={closeMobileSidebarAfterNavigation}
            >
              <ThreadList />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
};
