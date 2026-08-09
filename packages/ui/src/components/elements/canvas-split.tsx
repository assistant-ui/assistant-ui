"use client";

import { CheckIcon, CopyIcon, FileTextIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, ghostButton, mono, paper } from "./surfaces";

export interface CanvasMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export function CanvasSplit({
  messages,
  title,
  version,
  lines,
  visibleLines,
  saved,
  onCopy,
  onClose,
  className,
}: {
  messages: readonly CanvasMessage[];
  title: string;
  version: number;
  lines: readonly string[];
  visibleLines: number;
  saved: boolean;
  onCopy?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        paper,
        "flex w-full max-w-3xl flex-col overflow-hidden rounded-[20px] md:h-80 md:flex-row",
        className,
      )}
    >
      <div className="border-foreground/[0.07] flex flex-col gap-3 border-b p-4 md:w-[15rem] md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "fade-in animate-in fill-mode-both text-[13px] leading-relaxed duration-300",
              message.role === "user"
                ? cn(field, "text-foreground/80 ml-auto rounded-2xl px-3 py-2")
                : "text-foreground/60",
            )}
          >
            {message.text}
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-foreground/[0.07] flex items-center gap-2 border-b px-3.5 py-2.5">
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

        <div className="flex min-h-[9rem] flex-1 flex-col gap-1.5 overflow-y-auto p-4">
          {lines.slice(0, visibleLines).map((line, i) => (
            <p
              key={`${i}-${line}`}
              className={cn(
                "fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-[13px] leading-relaxed duration-300",
                line.startsWith("#")
                  ? "text-foreground/95 font-medium"
                  : "text-foreground/65",
              )}
            >
              {line.replace(/^#\s*/, "")}
            </p>
          ))}
          {visibleLines < lines.length && (
            <span
              aria-hidden
              className="bg-foreground/70 h-[1.05em] w-[2px] animate-pulse rounded-full motion-reduce:animate-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
