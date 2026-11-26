"use client";

/**
 * A chat app's frame: past conversations in a sidebar you can drag wider or
 * collapse to a rail, and in a
 * sheet when the frame is narrow, beside whatever a block renders as its main
 * area. Blocks compose it instead of copying it. Render it inside a runtime
 * with a thread list.
 */

import {
  ThreadList,
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
  ThreadListSearch,
} from "@/components/assistant-ui/elements/thread-list.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useAuiState } from "@assistant-ui/react";
import { MenuIcon, PanelLeftIcon } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePanelRef } from "react-resizable-panels";

/** Below this width the sidebar moves into a sheet. */
const NARROW_WIDTH = 768;

type ChatSidebarProps = {
  /** The main area beside the sidebar, such as a thread. */
  children: ReactNode;
  /** Names the sidebar and its phone sheet when no header is given. */
  title?: string | undefined;
  /** Replaces the title in the sidebar's top row, for a logo or a switcher. */
  sidebarHeader?: ReactNode | undefined;
  /** Replaces the title at the top of the phone sheet. */
  sheetHeader?: ReactNode | undefined;
  /** Rows under the conversation list, such as a user menu. */
  sidebarFooter?: ReactNode | undefined;
  railClassName?: string | undefined;
  /**
   * Pass `collapsed` (and `mobileOpen`) to drive the sidebar from your own
   * header; the sidebar then leaves out its own toggle and sheet trigger.
   */
  collapsed?: boolean | undefined;
  onCollapsedChange?: ((value: boolean) => void) | undefined;
  mobileOpen?: boolean | undefined;
  onMobileOpenChange?: ((value: boolean) => void) | undefined;
  showSearch?: boolean | undefined;
};

export const ChatSidebar: FC<ChatSidebarProps> = ({
  children,
  title = "Chats",
  sidebarHeader,
  sheetHeader,
  sidebarFooter,
  railClassName,
  collapsed,
  onCollapsedChange,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange,
  showSearch = true,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);

  // A controlled value means the caller renders the chrome that drives it, so
  // the shell omits its own toggle / trigger and forwards changes instead.
  const collapsedControlled = collapsed !== undefined;
  const mobileControlled = mobileOpenProp !== undefined;

  const sidebarCollapsed = collapsed ?? internalCollapsed;
  const mobileOpen = mobileOpenProp ?? internalMobileOpen;

  const setSidebarCollapsed = (value: boolean) => {
    if (!collapsedControlled) setInternalCollapsed(value);
    onCollapsedChange?.(value);
  };
  const setMobileOpen = (open: boolean) => {
    if (!mobileControlled) setInternalMobileOpen(open);
    onMobileOpenChange?.(open);
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

  // The layout follows the frame's own width, not the window's, so it fits a
  // narrow column as it does a phone.
  const rootRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) =>
      setNarrow((entry?.contentRect.width ?? 0) < NARROW_WIDTH),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // The toggle and a drag past the minimum both collapse the panel; keep the
  // two in step.
  const sidebarPanel = usePanelRef();
  useEffect(() => {
    const panel = sidebarPanel.current;
    if (!panel) return;
    if (sidebarCollapsed && !panel.isCollapsed()) panel.collapse();
    if (!sidebarCollapsed && panel.isCollapsed()) panel.expand();
  }, [sidebarCollapsed, narrow, sidebarPanel]);

  const sidebar = (
    <aside
      className={cn(
        "bg-muted/30 flex h-full w-full flex-col overflow-hidden",
        railClassName,
      )}
    >
      <div className="flex h-12 shrink-0 items-center overflow-hidden px-2">
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
        {sidebarHeader !== undefined
          ? sidebarHeader
          : !sidebarCollapsed && (
              <span className="ml-2 truncate text-sm font-medium">{title}</span>
            )}
      </div>

      <ThreadListRoot
        className={cn(
          "relative flex-1 transition-[padding,width] duration-200",
          sidebarCollapsed
            ? "overflow-hidden px-2 pt-1"
            : "overflow-y-auto p-3",
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={newThread} />
            {sidebarCollapsed && (
              <TooltipContent side="right">New Thread</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {showSearch && hasThreads && (
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
      </ThreadListRoot>
      {sidebarFooter !== undefined && !sidebarCollapsed && (
        <div className="shrink-0 border-t p-2">{sidebarFooter}</div>
      )}
    </aside>
  );

  const main = (
    <div className="h-full min-w-0 flex-1 overflow-hidden">{children}</div>
  );

  return (
    <div
      ref={rootRef}
      className="@container/chat-sidebar relative flex h-full w-full overflow-hidden"
    >
      {narrow ? (
        main
      ) : (
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel
            panelRef={sidebarPanel}
            collapsible
            collapsedSize="48px"
            minSize="200px"
            maxSize="420px"
            defaultSize={sidebarCollapsed ? "48px" : "260px"}
            onResize={() => {
              const isCollapsed = sidebarPanel.current?.isCollapsed();
              if (isCollapsed !== undefined && isCollapsed !== sidebarCollapsed)
                setSidebarCollapsed(isCollapsed);
            }}
          >
            {sidebar}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel minSize="320px">{main}</ResizablePanel>
        </ResizablePanelGroup>
      )}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        {!mobileControlled && narrow && (
          <div className="absolute top-2 left-2 z-20">
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/70 size-8"
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
            {sheetHeader ?? title}
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
  );
};
