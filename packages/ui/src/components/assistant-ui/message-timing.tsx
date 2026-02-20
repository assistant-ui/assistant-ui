"use client";

import { useMessageTiming } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import type { FC } from "react";

const formatTimingMs = (ms: number | undefined): string => {
  if (ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Shows streaming stats (TTFT, total time, tok/s, chunks) as a badge with a
 * hover popover. Renders nothing until the stream completes.
 *
 * Place it inside `ActionBarPrimitive.Root` in your `thread.tsx` so it
 * inherits the action bar's autohide behaviour:
 *
 * ```tsx
 * import { MessageTiming } from "@/components/assistant-ui/message-timing";
 *
 * <ActionBarPrimitive.Root >
 *   <ActionBarPrimitive.Copy />
 *   <ActionBarPrimitive.Reload />
 *   <MessageTiming />  // <-- add this
 * </ActionBarPrimitive.Root>
 * ```
 */
export const MessageTiming: FC<{ className?: string }> = ({ className }) => {
  const timing = useMessageTiming();
  if (timing?.totalStreamTime === undefined) return null;

  return (
    <div
      data-slot="message-timing-root"
      className={cn("group/timing relative", className)}
    >
      <button
        type="button"
        data-slot="message-timing-trigger"
        aria-label="Message timing"
        className="flex items-center rounded-md p-1 font-mono text-muted-foreground text-xs tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {formatTimingMs(timing.totalStreamTime)}
      </button>
      <div
        data-slot="message-timing-popover"
        className="pointer-events-none absolute top-1/2 left-full z-10 ml-2 -translate-y-1/2 scale-95 rounded-lg border bg-popover px-3 py-2 text-popover-foreground opacity-0 shadow-md transition-all before:absolute before:top-0 before:-left-2 before:h-full before:w-2 before:content-[''] group-focus-within/timing:pointer-events-auto group-focus-within/timing:scale-100 group-focus-within/timing:opacity-100 group-hover/timing:pointer-events-auto group-hover/timing:scale-100 group-hover/timing:opacity-100"
      >
        <div className="grid min-w-35 gap-1.5 text-xs">
          {timing.firstTokenTime !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">First token</span>
              <span className="font-mono tabular-nums">
                {formatTimingMs(timing.firstTokenTime)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono tabular-nums">
              {formatTimingMs(timing.totalStreamTime)}
            </span>
          </div>
          {timing.tokensPerSecond !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Speed</span>
              <span className="font-mono tabular-nums">
                {timing.tokensPerSecond.toFixed(1)} tok/s
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Chunks</span>
            <span className="font-mono tabular-nums">{timing.totalChunks}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
