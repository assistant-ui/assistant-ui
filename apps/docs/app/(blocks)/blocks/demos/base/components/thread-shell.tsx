"use client";

import type { FC, MouseEvent, ReactNode } from "react";
import {
  ThreadList,
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
} from "@/components/assistant-ui/elements/thread-list.aui";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { rItem, textControl } from "./design";

/**
 * The sidebar around the chat: a rail of chats that narrows to its New chat
 * button, and a sheet with the same list on a phone.
 */
export const ThreadShell: FC<{
  children: ReactNode;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  header: ReactNode;
  sheetTitle: ReactNode;
}> = ({
  children,
  collapsed,
  mobileOpen,
  onMobileOpenChange,
  header,
  sheetTitle,
}) => {
  const closeAfterNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    if (
      event.target.closest(
        '[data-slot="aui_thread-list-item-trigger"], [data-slot="aui_thread-list-new"]',
      )
    ) {
      onMobileOpenChange(false);
    }
  };

  const newThread = (
    <ThreadListNew
      className={cn(
        "h-8 overflow-hidden font-normal transition-[width,padding] duration-200 motion-reduce:transition-none [&_svg]:size-4",
        rItem,
        textControl,
        collapsed
          ? "w-8 gap-0 px-2 has-[>svg]:px-2"
          : "w-full gap-2 px-2 has-[>svg]:px-2",
      )}
      labelClassName={cn(
        "overflow-hidden transition-[max-width,opacity] duration-200 motion-reduce:transition-none",
        collapsed ? "max-w-0 opacity-0" : "max-w-24 opacity-100",
      )}
    />
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 motion-reduce:transition-none md:flex",
          collapsed ? "w-12" : "w-64",
        )}
      >
        <div className="flex h-12 shrink-0 items-center overflow-hidden px-2">
          {header}
        </div>

        <ThreadListRoot
          className={cn(
            "relative flex-1 transition-[padding,width] duration-200 motion-reduce:transition-none",
            collapsed
              ? "w-12 overflow-hidden px-2 pt-1"
              : "w-64 overflow-y-auto px-2 pt-1 pb-3",
          )}
        >
          <Tooltip>
            <TooltipTrigger render={newThread} />
            {collapsed && (
              <TooltipContent side="right">New chat</TooltipContent>
            )}
          </Tooltip>
          <ThreadListItems
            aria-hidden={collapsed}
            inert={collapsed}
            className={cn(
              "transition-opacity duration-150 motion-reduce:transition-none",
              textControl,
              collapsed && "pointer-events-none opacity-0",
            )}
          />
        </ThreadListRoot>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="bg-background flex flex-col p-0">
          <SheetTitle className="flex h-12 shrink-0 items-center px-4">
            {sheetTitle}
          </SheetTitle>
          <div
            className={cn(
              "relative flex-1 overflow-y-auto px-2 pb-3",
              textControl,
            )}
            onClick={closeAfterNavigation}
          >
            <ThreadList />
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
};
