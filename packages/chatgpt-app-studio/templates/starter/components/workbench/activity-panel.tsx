"use client";

import { useConsoleLogs, useClearConsole } from "@/lib/workbench/store";
import { ActivitySection } from "./activity-section";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ActivityPanel() {
  const consoleLogs = useConsoleLogs();
  const clearConsole = useClearConsole();
  const logCount = consoleLogs.length;

  return (
    <div className="flex h-full flex-col overflow-hidden pt-6">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-4">
        <div className="flex select-none items-center gap-2">
          <span className="text-muted-foreground text-sm">Activity</span>
          {logCount > 0 && (
            <span className="squircle rounded-full border px-1.5 py-0.5 text-muted-foreground text-xs tabular-nums">
              {logCount}
            </span>
          )}
        </div>
        {logCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-9"
                onClick={clearConsole}
              >
                <Trash2 className="size-4 text-neutral-500 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Clear</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-clip">
        <ActivitySection />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}
