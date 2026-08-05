"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface Segment {
  text: string;
  mono?: boolean;
}

export function StreamingText({
  segments,
  count,
  streaming,
  className,
}: {
  segments: Segment[];
  count: number;
  streaming: boolean;
  className?: string;
}) {
  const words = useMemo(
    () =>
      segments.flatMap((segment) =>
        segment.text
          .split(" ")
          .map((word) => ({ word, mono: segment.mono ?? false })),
      ),
    [segments],
  );

  return (
    <p
      className={cn(
        "min-h-[8.5rem] max-w-sm text-sm leading-relaxed text-pretty",
        className,
      )}
    >
      {words.slice(0, count).map(({ word, mono: isMono }, i) => {
        const fresh = streaming && count - 1 - i < 2;
        return (
          <span
            key={i}
            className="fade-in animate-in fill-mode-both duration-500 motion-reduce:animate-none"
          >
            <span
              className={cn(
                "transition-colors duration-700 motion-reduce:transition-none",
                fresh && "text-blue-500 dark:text-blue-400",
                isMono &&
                  "bg-foreground/[0.06] rounded-md px-1.5 py-0.5 font-mono text-[0.85em]",
              )}
            >
              {word}
            </span>{" "}
          </span>
        );
      })}
      {streaming && count > 0 && (
        <span
          aria-hidden
          className="-mb-0.5 ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400"
        />
      )}
    </p>
  );
}
