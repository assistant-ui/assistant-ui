"use client";

import type { ComponentProps } from "react";
import { FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface DocumentAnchor {
  page: number;
  quote: string;
}

export function DocumentReference({
  title,
  pages,
  anchors,
  activePage,
  onJump,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "title" | "pages" | "anchors" | "activePage" | "onJump"
> & {
  title: string;
  pages: number;
  anchors: readonly DocumentAnchor[];
  activePage: number;
  onJump?: (page: number) => void;
}) {
  return (
    <div
      data-slot="document-reference"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-3.5",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-foreground/[0.05] text-foreground/45 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <FileTextIcon className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-medium">{title}</span>
          <span className={cn(mono, "text-foreground/30")}>
            {pages} pages · {anchors.length} cited
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {anchors.map((anchor, i) => (
          <button
            key={`${anchor.page}-${i}`}
            type="button"
            onClick={() => onJump?.(anchor.page)}
            className={cn(
              "flex flex-col gap-1 rounded-xl px-2.5 py-2 text-start transition-colors",
              anchor.page === activePage
                ? field
                : "hover:bg-foreground/[0.035]",
            )}
          >
            <span className={cn(mono, "text-foreground/30")}>
              p. {anchor.page}
            </span>
            <span className="text-foreground/65 border-foreground/15 border-s-2 ps-2 text-xs leading-relaxed">
              {anchor.quote}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
