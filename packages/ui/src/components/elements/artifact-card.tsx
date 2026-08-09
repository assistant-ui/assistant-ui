"use client";

import type { ComponentProps } from "react";
import { ArrowUpRightIcon, FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export function ArtifactCard({
  title,
  meta,
  generating = false,
  words = 0,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "title" | "meta" | "generating" | "words"
> & {
  title: string;
  meta: string;
  generating?: boolean;
  words?: number;
}) {
  return (
    <div
      data-slot="artifact-card"
      className={cn(
        paper,
        "group flex w-full max-w-xs cursor-pointer items-center gap-3 rounded-[20px] p-3.5 transition-transform duration-150 hover:-translate-y-px active:scale-[0.98]",
        className,
      )}

      {...props}
    >
      <span className="bg-foreground/[0.05] text-foreground/45 flex size-9 shrink-0 items-center justify-center rounded-xl">
        <FileTextIcon
          className={cn(
            "size-4",
            generating && "animate-pulse motion-reduce:animate-none",
          )}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{title}</p>
        {generating ? (
          <p className={cn(mono, "text-foreground/40 flex items-center gap-1")}>
            <span className="relative inline-block leading-none">
              <span>Writing</span>
              <span
                aria-hidden
                className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
              >
                Writing
              </span>
            </span>
            <span>·</span>
            <span className="tabular-nums">{words} words</span>
          </p>
        ) : (
          <p
            className={cn(
              mono,
              "fade-in blur-in-[2px] animate-in text-foreground/40 duration-300 motion-reduce:animate-none",
            )}
          >
            {meta}
          </p>
        )}
      </div>
      <ArrowUpRightIcon className="text-foreground/35 size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
