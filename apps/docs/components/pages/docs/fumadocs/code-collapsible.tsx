"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";

/**
 * The preview stays mounted and visible while collapsed; only its height is
 * clamped. A collapsible panel hides its content when closed, which is the
 * opposite, so this owns the reveal rather than wrapping a primitive.
 */
export function CodeCollapsible({
  code: _code,
  children,
  className,
}: {
  code: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const previewId = React.useId();

  return (
    <div className={cn("relative my-4", className)}>
      <div
        id={previewId}
        className={cn(
          "relative overflow-hidden [&_figure]:my-0",
          !isOpen && "max-h-[200px]",
        )}
      >
        {children}
      </div>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls={previewId}
          className="border-foreground/10 bg-background text-muted-foreground hover:text-foreground absolute inset-x-0 bottom-0 flex h-9 cursor-pointer items-center justify-center gap-1.5 border-t font-mono text-[11px] tracking-wide transition-colors"
        >
          <ChevronDownIcon className="size-3.5" />
          Show more
        </button>
      )}
    </div>
  );
}
