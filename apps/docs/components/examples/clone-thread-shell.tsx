"use client";

import {
  ThreadList,
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
} from "@/components/assistant-ui/thread-list";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/radix/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/radix/sheet";
import { cn } from "@/lib/utils";
import { MenuIcon, PanelLeftIcon } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";

type CloneThreadShellProps = {
  children: ReactNode;
};

export const CloneThreadShell: FC<CloneThreadShellProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <aside
        className={cn(
          "bg-muted/30 hidden h-full shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 md:flex",
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
            "relative flex-1 overflow-y-auto transition-[padding,width] duration-200",
            sidebarCollapsed ? "w-12 px-2 pt-1" : "w-65 p-3",
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
          <ThreadListItems
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
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MenuIcon className="size-4" />
              <span className="sr-only">Open chat history</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-70 flex-col p-0">
            <div className="flex h-12 shrink-0 items-center px-4 text-sm font-medium">
              Chats
            </div>
            <div className="relative flex-1 overflow-y-auto p-3">
              <ThreadList />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
};
