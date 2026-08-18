"use client";

import {
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuiState } from "@assistant-ui/react";
import { MenuIcon, PanelLeftIcon } from "lucide-react";
import { useState, type FC, type MouseEvent, type ReactNode } from "react";

// Mirrors assistant-shell: each fade zone equals the scroll container's padding on that edge (pt-3 / pb-6), so at rest and at either scroll end only padding sits in the fade and no row is dimmed.
const SCROLL_FADE_CLASS =
  "[mask-image:linear-gradient(to_bottom,transparent,black_0.75rem,black_calc(100%-1.5rem),transparent)]";

type CloneThreadShellProps = {
  children: ReactNode;
  railClassName?: string | undefined;
  collapsed?: boolean | undefined;
  onCollapsedChange?: ((value: boolean) => void) | undefined;
  mobileSidebarOpen?: boolean | undefined;
  onMobileSidebarOpenChange?: ((value: boolean) => void) | undefined;
  headerContent?: ReactNode | undefined;
  sheetTitle?: ReactNode | undefined;
  showSearch?: boolean | undefined;
  wrapNewThreadTooltip?: boolean | undefined;
};

export const CloneThreadShell: FC<CloneThreadShellProps> = ({
  children,
  railClassName,
  collapsed,
  onCollapsedChange,
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
  headerContent,
  sheetTitle,
  showSearch = true,
  wrapNewThreadTooltip = false,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);

  // A controlled value means the caller renders the chrome that drives it, so
  // the shell omits its own toggle / trigger and forwards changes instead.
  const collapsedControlled = collapsed !== undefined;
  const mobileControlled = mobileSidebarOpen !== undefined;

  const sidebarCollapsed = collapsed ?? internalCollapsed;
  const mobileOpen = mobileSidebarOpen ?? internalMobileOpen;

  const setSidebarCollapsed = (value: boolean) => {
    if (!collapsedControlled) setInternalCollapsed(value);
    onCollapsedChange?.(value);
  };
  const setMobileOpen = (open: boolean) => {
    if (!mobileControlled) setInternalMobileOpen(open);
    onMobileSidebarOpenChange?.(open);
  };

  const closeMobileSidebarAfterNavigation = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (!(event.target instanceof Element)) return;
    if (
      event.target.closest(
        '[data-slot="aui_thread-list-item-trigger"], [data-slot="aui_thread-list-new"]',
      )
    ) {
      setMobileOpen(false);
    }
  };

  const newThread = (
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
  );

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
          {!collapsedControlled && (
            <TooltipIconButton
              variant="ghost"
              size="icon"
              tooltip={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              side="right"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="size-8"
            >
              <PanelLeftIcon className="size-4" />
            </TooltipIconButton>
          )}
          {headerContent !== undefined
            ? headerContent
            : !sidebarCollapsed && (
                <span className="ml-2 truncate text-sm font-medium">Chats</span>
              )}
        </div>

        <ThreadListRoot
          className={cn(
            "min-h-0 flex-1 overflow-hidden transition-[width] duration-200",
            sidebarCollapsed ? "w-12" : "w-65",
          )}
        >
          <div
            className={cn(
              "shrink-0 transition-[padding] duration-200",
              sidebarCollapsed ? "px-2 pt-1 pb-2" : "px-3 pt-2 pb-1.5",
            )}
          >
            {wrapNewThreadTooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={newThread} />
                  {sidebarCollapsed && (
                    <TooltipContent side="right">New Thread</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ) : (
              newThread
            )}
            {showSearch && hasThreads && (
              <div
                aria-hidden={sidebarCollapsed}
                inert={sidebarCollapsed}
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  sidebarCollapsed
                    ? "pointer-events-none max-h-0 opacity-0"
                    : "mt-1 max-h-12 opacity-100",
                )}
              >
                <ThreadListSearch value={search} onValueChange={setSearch} />
              </div>
            )}
          </div>
          <div
            className={cn(
              // The scrollbar is hidden because classic scrollbars reserve width from the right edge and knock the rows off-center; the edge fades signal overflow instead.
              "relative flex-1 [scrollbar-width:none] overflow-x-hidden pt-3 pb-6 transition-[padding] duration-200 [&::-webkit-scrollbar]:hidden",
              sidebarCollapsed
                ? "overflow-y-hidden px-2"
                : "overflow-y-auto px-3",
              SCROLL_FADE_CLASS,
            )}
          >
            <ThreadListItems
              searchQuery={showSearch && hasThreads ? search : ""}
              aria-hidden={sidebarCollapsed}
              inert={sidebarCollapsed}
              className={cn(
                "transition-[opacity,transform] duration-150",
                sidebarCollapsed
                  ? "pointer-events-none opacity-0"
                  : "translate-x-0 opacity-100",
              )}
            />
          </div>
        </ThreadListRoot>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        {!mobileControlled && (
          <div className="absolute top-2 left-2 z-20 md:hidden">
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
          </div>
        )}
        <SheetContent side="left" className="flex flex-col p-0">
          <SheetTitle className="flex h-12 shrink-0 items-center px-4 text-sm font-medium">
            {sheetTitle ?? "Chats"}
          </SheetTitle>
          <ThreadListRoot
            className="min-h-0 flex-1 overflow-hidden"
            onClick={closeMobileSidebarAfterNavigation}
          >
            <div className="shrink-0 px-3 pt-2 pb-1.5">
              <ThreadListNew className="w-full" />
              {showSearch && hasThreads && (
                <div className="mt-1">
                  <ThreadListSearch value={search} onValueChange={setSearch} />
                </div>
              )}
            </div>
            <div
              className={cn(
                "relative flex-1 [scrollbar-width:none] overflow-y-auto px-3 pt-3 pb-6 [&::-webkit-scrollbar]:hidden",
                SCROLL_FADE_CLASS,
              )}
            >
              <ThreadListItems
                searchQuery={showSearch && hasThreads ? search : ""}
              />
            </div>
          </ThreadListRoot>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
};
