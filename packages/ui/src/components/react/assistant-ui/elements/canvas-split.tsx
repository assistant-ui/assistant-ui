"use client";

import type { ComponentProps } from "react";
import { CheckIcon, CopyIcon, FileTextIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, ghostButton, mono, paper } from "./surfaces";

export function CanvasSplit({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-split"
      className={cn(
        paper,
        "flex w-full max-w-3xl flex-col overflow-hidden rounded-[20px] md:h-80 md:flex-row",
        className,
      )}
      {...props}
    />
  );
}

export function CanvasSplitThread({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-split-thread"
      className={cn(
        "border-foreground/[0.07] flex flex-col gap-3 border-b p-4 md:w-[15rem] md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

export function CanvasSplitMessage({
  speaker,
  className,
  ...props
}: ComponentProps<"div"> & { speaker: "user" | "assistant" }) {
  return (
    <div
      data-slot="canvas-split-message"
      data-speaker={speaker}
      className={cn(
        "fade-in animate-in fill-mode-both text-[13px] leading-relaxed duration-300",
        speaker === "user"
          ? cn(field, "text-foreground/80 ms-auto rounded-2xl px-3 py-2")
          : "text-foreground/60",
        className,
      )}
      {...props}
    />
  );
}

export function CanvasSplitDocument({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-split-document"
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

export function CanvasSplitHeader({
  title,
  version,
  saved,
  onCopy,
  onClose,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "title"> & {
  title: string;
  version: number;
  saved: boolean;
  onCopy?: () => void;
  onClose?: () => void;
}) {
  return (
    <div
      data-slot="canvas-split-header"
      className={cn(
        "border-foreground/[0.07] flex items-center gap-2 border-b px-3.5 py-2.5",
        className,
      )}
      {...props}
    >
      <FileTextIcon className="text-foreground/35 size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {title}
      </span>
      <span className={cn(mono, "text-foreground/30 shrink-0")}>
        v{version}
      </span>
      <span
        className={cn(
          mono,
          "shrink-0 transition-colors duration-300",
          saved
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-foreground/30",
        )}
      >
        {saved ? (
          <span className="flex items-center gap-1">
            <CheckIcon className="size-3" />
            saved
          </span>
        ) : (
          "editing"
        )}
      </span>
      <button
        type="button"
        aria-label={`Copy ${title}`}
        onClick={onCopy}
        disabled={!onCopy}
        className={cn(
          ghostButton,
          "size-7 shrink-0 disabled:pointer-events-none disabled:opacity-30",
        )}
      >
        <CopyIcon className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Close the canvas"
        onClick={onClose}
        disabled={!onClose}
        className={cn(
          ghostButton,
          "size-7 shrink-0 disabled:pointer-events-none disabled:opacity-30",
        )}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}

export function CanvasSplitBody({
  writing,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { writing?: boolean }) {
  return (
    <div
      data-slot="canvas-split-body"
      className={cn(
        "flex min-h-[9rem] flex-1 flex-col gap-1.5 overflow-y-auto p-4",
        className,
      )}
      {...props}
    >
      {children}
      {writing && (
        <span
          aria-hidden
          className="bg-foreground/70 h-[1.05em] w-[2px] animate-pulse rounded-full motion-reduce:animate-none"
        />
      )}
    </div>
  );
}

export function CanvasSplitLine({
  heading,
  className,
  ...props
}: ComponentProps<"p"> & { heading?: boolean }) {
  return (
    <p
      data-slot="canvas-split-line"
      className={cn(
        "fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-[13px] leading-relaxed duration-300",
        heading ? "text-foreground/95 font-medium" : "text-foreground/65",
        className,
      )}
      {...props}
    />
  );
}
