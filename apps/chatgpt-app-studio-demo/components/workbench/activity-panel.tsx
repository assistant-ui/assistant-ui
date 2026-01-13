"use client";

import { useState } from "react";
import { useConsoleLogs, useClearConsole } from "@/lib/workbench/store";
import { ActivitySection } from "./activity-section";
import { MockConfigPanel } from "./mock-config-panel";
import { Button } from "@/components/ui/button";
import { Trash2, Activity, Wrench } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/ui/cn";

type ActivityTab = "activity" | "simulation";

export function ActivityPanel() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("activity");
  const consoleLogs = useConsoleLogs();
  const clearConsole = useClearConsole();
  const logCount = consoleLogs.length;

  return (
    <div className="flex h-full flex-col overflow-hidden pt-6">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-4">
        <div className="flex select-none items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
              activeTab === "activity"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Activity className="size-3.5" />
            Activity
            {logCount > 0 && (
              <span className="rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums">
                {logCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulation")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
              activeTab === "simulation"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Wrench className="size-3.5" />
            Simulation
          </button>
        </div>
        {activeTab === "activity" && logCount > 0 && (
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
        {activeTab === "activity" ? (
          <>
            <ActivitySection />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
              aria-hidden
            />
          </>
        ) : (
          <MockConfigPanel />
        )}
      </div>
    </div>
  );
}
