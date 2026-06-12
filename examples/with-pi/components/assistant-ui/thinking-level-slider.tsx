"use client";

import type { KeyboardEvent } from "react";
import { useModelSelectorEfforts } from "@/components/assistant-ui/model-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Line-graph style thinking level picker, composed into ModelSelector.Content
 * via the useModelSelectorEfforts hook. Pi models expose up to six levels,
 * which overflow the built-in horizontal ModelSelector.Effort layout — here
 * each level is a thin vertical line that grows on hover and names itself in
 * a tooltip, with the active level standing taller in the accent color.
 */
export const ThinkingLevelSlider = ({
  label = "Thinking",
}: {
  label?: string;
}) => {
  const { efforts, effort, setEffort } = useModelSelectorEfforts();

  if (!efforts?.length) return null;

  const activeIndex = efforts.findIndex((e) => e.id === effort);
  const lastIndex = efforts.length - 1;

  const selectIndex = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const target = Math.min(Math.max(index, 0), lastIndex);
    const next = efforts[target];
    if (!next) return;
    event.preventDefault();
    setEffort(next.id);
    event.currentTarget
      .querySelectorAll<HTMLElement>('[role="radio"]')
      [target]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-end"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            selectIndex(event, activeIndex + 1);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            selectIndex(event, activeIndex - 1);
          } else if (event.key === "Home") {
            selectIndex(event, 0);
          } else if (event.key === "End") {
            selectIndex(event, lastIndex);
          }
        }}
      >
        {efforts.map((option, index) => {
          const isActive = index === activeIndex;
          return (
            <Tooltip key={option.id} disableHoverableContent>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={option.name}
                  tabIndex={index === Math.max(activeIndex, 0) ? 0 : -1}
                  data-state={isActive ? "on" : "off"}
                  onClick={() => setEffort(option.id)}
                  className="group focus-visible:ring-ring/50 flex h-6 w-3.5 items-end justify-center rounded-sm outline-none focus-visible:ring-2"
                >
                  <span
                    className={cn(
                      "rounded-full transition-all duration-150 ease-out",
                      isActive
                        ? "bg-primary h-4.5 w-0.5"
                        : "bg-muted-foreground/40 group-hover:bg-foreground/70 h-2.5 w-0.5 group-hover:h-4 group-hover:w-[3px] group-focus-visible:h-4 group-focus-visible:w-[3px]",
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={2}>
                {option.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <span className="text-foreground min-w-12 text-end text-xs">
        {efforts[activeIndex]?.name}
      </span>
    </div>
  );
};
