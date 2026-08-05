"use client";

import { ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { inkButton, paper } from "./surfaces";

export interface EmptyStateProps {
  greeting: string;
  suggestions: readonly string[];
  className?: string;
}

export function EmptyState({
  greeting,
  suggestions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-7",
        className,
      )}
    >
      <h2 className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-center text-2xl font-medium tracking-tight duration-500 motion-reduce:animate-none">
        {greeting}
      </h2>

      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion, i) => (
          <button
            key={suggestion}
            type="button"
            className={cn(
              paper,
              "fade-in slide-in-from-bottom-2 animate-in fill-mode-both focus-visible:ring-foreground/20 rounded-full px-4 py-2 text-[13px] transition-transform duration-500 outline-none hover:-translate-y-px focus-visible:ring-2 active:scale-[0.96] motion-reduce:animate-none",
            )}
            style={{ animationDelay: `${120 + i * 70}ms` }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div
        className={cn(
          paper,
          "fade-in slide-in-from-bottom-2 animate-in fill-mode-both flex h-13 w-full items-center justify-between rounded-full py-2 ps-5 pe-2.5 duration-500 motion-reduce:animate-none",
        )}
        style={{ animationDelay: "360ms" }}
      >
        <span className="text-foreground/35 text-[15px]">Ask anything</span>
        <span
          className={cn(
            inkButton,
            "flex size-8 items-center justify-center rounded-full",
          )}
        >
          <ArrowUpIcon className="size-4" />
        </span>
      </div>
    </div>
  );
}
