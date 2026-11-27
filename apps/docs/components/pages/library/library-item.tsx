"use client";

import type { ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The tinted frame around a library item's preview; it answers to its `group/navlink` item. */
export const itemFrame =
  "bg-foreground/[0.03] group-hover/navlink:bg-foreground/[0.05] dark:bg-foreground/[0.045] dark:group-hover/navlink:bg-foreground/[0.07] group-has-[button[aria-haspopup=dialog]:focus-visible]/navlink:ring-ring transition-colors group-has-[button[aria-haspopup=dialog]:focus-visible]/navlink:ring-2";

/** An item's name as the button that opens its details; the click area covers the whole item. */
export function ItemTitle({
  label,
  onSelect,
  className,
}: {
  label: string;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onSelect}
          className="cursor-pointer text-left underline-offset-4 outline-none group-hover/navlink:underline after:absolute after:inset-0"
        >
          {label}
        </button>
      </h3>
      <ArrowRightIcon
        aria-hidden
        className="text-muted-foreground size-3.5 shrink-0 self-center opacity-0 transition-opacity group-hover/navlink:opacity-100 motion-reduce:transition-none"
      />
    </div>
  );
}

/** A line glyph scaled to fill the middle of a preview. */
export function ItemGlyph({ children }: { children: ReactNode }) {
  return (
    <span className="[container-type:size] flex size-full items-center justify-center">
      <span className="flex w-[min(36cqw,64cqh)] [&>svg]:h-auto [&>svg]:w-full [&>svg]:[stroke-width:0.5]">
        {children}
      </span>
    </span>
  );
}

/** An item's small preview, as a list row and the saved panel show it. */
export function ItemThumbnail({ children }: { children: ReactNode }) {
  return (
    <div className={cn(itemFrame, "shrink-0 rounded-[18px] p-2")}>
      <div className="bg-background relative flex aspect-[16/10] w-24 items-center justify-center overflow-hidden rounded-[10px]">
        {children}
      </div>
    </div>
  );
}
