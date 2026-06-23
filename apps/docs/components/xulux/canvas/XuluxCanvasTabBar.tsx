"use client";

import type { ComponentType, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/assistant-ui/tabs";
import { cn } from "@/lib/utils";

export type CanvasTab = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
};

type Props = {
  tabs: CanvasTab[];
  isLoading?: boolean;
  actions?: ReactNode;
};

const triggerClassName = cn(
  "group/tab-trigger h-8 max-w-[min(220px,40vw)] min-w-[90px] !flex-none shrink-0 grow-0 basis-auto gap-1.5 rounded-t-[10px] rounded-b-none px-3 text-xs transition-colors duration-200",
  "border-border/60 border border-b-0",
  "data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-[#f1f3f4]/90",
  "dark:data-[state=inactive]:bg-[#2a2a2d]/90",
  "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
);

export function XuluxCanvasTabBar({ tabs, isLoading = false, actions }: Props) {
  return (
    <div className="flex h-9 shrink-0 items-end gap-0 bg-[#e8eaed] pt-1 pr-1 pl-2 dark:bg-[#202124]">
      <TabsList
        variant="outline"
        size="sm"
        className={cn(
          "h-8 w-fit max-w-full gap-1.5 rounded-none border-0 bg-transparent p-0",
          // Hide the sliding indicator — it measures before layout is ready and overlaps tabs.
          "[&_[data-slot=tabs-active-indicator]]:hidden",
          "[&_[data-slot=tabs-hover-indicator]]:hidden",
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={tab.disabled}
              className={triggerClassName}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{tab.label}</span>
              {isLoading ? (
                <Loader2 className="text-muted-foreground hidden size-3 shrink-0 animate-spin group-data-[state=active]/tab-trigger:inline-block" />
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {actions ? (
        <div className="mb-0.5 ml-auto flex shrink-0 items-center gap-0.5 pr-0.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
