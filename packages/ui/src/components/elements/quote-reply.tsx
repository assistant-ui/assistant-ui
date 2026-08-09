"use client";

import type { ComponentProps } from "react";
import { PencilLineIcon, QuoteIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { floating, mono } from "./surfaces";

export interface QuoteAction {
  key: string;
  label: string;
  icon: "quote" | "explain" | "rewrite";
}

const ICON = {
  quote: QuoteIcon,
  explain: SparklesIcon,
  rewrite: PencilLineIcon,
} as const;

export function QuoteReply({
  before,
  selection,
  after,
  actions,
  toolbarVisible,
  quoted,
  onAction,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "before"
  | "selection"
  | "after"
  | "actions"
  | "toolbarVisible"
  | "quoted"
  | "onAction"
> & {
  before: string;
  selection: string;
  after: string;
  actions: readonly QuoteAction[];
  toolbarVisible: boolean;
  quoted?: string;
  onAction?: (key: string) => void;
}) {
  return (
    <div
      data-slot="quote-reply"
      className={cn("flex w-full max-w-sm flex-col gap-2.5", className)}

      {...props}
    >
      <p className="relative text-[13.5px] leading-relaxed">
        <span className="text-foreground/70">{before}</span>
        <span className="text-foreground/95 rounded bg-blue-500/18 px-0.5 dark:bg-blue-400/25">
          {selection}
        </span>
        <span className="text-foreground/70">{after}</span>
      </p>

      <div className="flex h-9 items-start">
        {toolbarVisible && (
          <div
            className={cn(
              floating,
              "fade-in zoom-in-95 slide-in-from-top-1 animate-in flex items-center gap-0.5 rounded-full p-1 duration-200",
            )}
          >
            {actions.map((action) => {
              const Icon = ICON[action.icon];
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => onAction?.(action.key)}
                  className="text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground/90 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
                >
                  <Icon className="size-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {quoted && (
        <div className="fade-in slide-in-from-bottom-1 animate-in flex flex-col gap-1 duration-300">
          <span className={cn(mono, "text-foreground/30")}>replying to</span>
          <div className="border-foreground/15 text-foreground/55 border-s-2 ps-2.5 text-xs leading-relaxed">
            {quoted}
          </div>
        </div>
      )}
    </div>
  );
}
