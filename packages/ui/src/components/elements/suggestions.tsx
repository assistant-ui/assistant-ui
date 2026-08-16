"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";

export interface SuggestionsProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  suggestions: readonly string[];
  selectedSuggestion: string | null;
  cycle: number;
  onSuggestion: (suggestion: string) => void;
  variant?: "pills" | "list";
}

export function Suggestions({
  suggestions,
  selectedSuggestion,
  cycle,
  onSuggestion,
  variant = "pills",
  className,
  ...props
}: SuggestionsProps) {
  const list = variant === "list";

  return (
    <div
      data-slot="suggestions"
      key={cycle}
      className={cn(
        list
          ? "flex w-full max-w-sm flex-col gap-2"
          : "flex max-w-md flex-wrap justify-center gap-2",
        className,
      )}

      {...props}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion}
          type="button"
          aria-pressed={selectedSuggestion === suggestion}
          onClick={() => onSuggestion(suggestion)}
          className={cn(
            paper,
            "fade-in slide-in-from-bottom-2 animate-in fill-mode-both flex cursor-pointer items-center text-[13px] transition-transform duration-300 hover:-translate-y-px active:scale-[0.96] motion-reduce:animate-none",
            list
              ? "w-full rounded-2xl px-4 py-2.5 text-start"
              : "rounded-full px-4 py-2",
            selectedSuggestion === suggestion &&
              "bg-foreground text-background",
          )}
          style={{ animationDelay: `${index * 70}ms` }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
