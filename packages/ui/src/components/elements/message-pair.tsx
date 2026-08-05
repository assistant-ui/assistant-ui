"use client";

import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ghostButton, paper } from "./surfaces";

export interface MessagePairProps {
  userMessage: string;
  words: readonly string[];
  visibleWords: number;
  streaming: boolean;
  variant?: "bubble" | "flat";
  className?: string;
}

export function MessagePair({
  userMessage,
  words,
  visibleWords,
  streaming,
  variant = "bubble",
  className,
}: MessagePairProps) {
  return (
    <div className={cn("flex w-full max-w-sm flex-col gap-5", className)}>
      <p
        className={cn(
          "max-w-[85%] self-end text-sm",
          variant === "bubble"
            ? cn(paper, "rounded-2xl px-3.5 py-2")
            : "text-foreground/90 text-end",
        )}
      >
        {userMessage}
      </p>
      <div className="group/message flex flex-col items-start">
        <p className="min-h-[4.25rem] text-sm leading-relaxed">
          {words.slice(0, visibleWords).map((word, index) => {
            const fresh = streaming && visibleWords - 1 - index < 2;

            return (
              <span
                key={`${word}-${index}`}
                className="fade-in animate-in fill-mode-both duration-500 motion-reduce:animate-none"
              >
                <span
                  className={cn(
                    "transition-colors duration-700 motion-reduce:transition-none",
                    fresh && "text-blue-500 dark:text-blue-400",
                  )}
                >
                  {word}
                </span>{" "}
              </span>
            );
          })}
          {streaming && visibleWords > 0 && (
            <span
              aria-hidden
              className="-mb-0.5 ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-blue-500 motion-reduce:animate-none dark:bg-blue-400"
            />
          )}
        </p>
        <div className="flex items-center gap-1 pt-1 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 motion-reduce:transition-none">
          <button
            type="button"
            aria-label="Copy response"
            className={cn(ghostButton, "size-7")}
          >
            <CopyIcon className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Regenerate response"
            className={cn(ghostButton, "size-7")}
          >
            <RefreshCwIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
