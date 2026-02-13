"use client";

import type { ComponentProps, FC } from "react";
import { useMessageTiming } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const MessageTimingRoot: FC<ComponentProps<"div">> = ({
  className,
  ...props
}) => {
  const timing = useMessageTiming();
  if (!timing) return null;

  return (
    <div
      data-slot="message-timing"
      className={cn(
        "aui-message-timing-root flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs",
        className,
      )}
      {...props}
    >
      {timing.totalStreamTime != null && (
        <span className="aui-message-timing-duration">
          {formatDuration(timing.totalStreamTime)}
        </span>
      )}
      {timing.tokensPerSecond != null && (
        <span className="aui-message-timing-speed">
          {timing.tokensPerSecond.toFixed(1)} tok/s
        </span>
      )}
      {timing.firstTokenTime != null && (
        <span className="aui-message-timing-ttft">
          TTFT {formatDuration(timing.firstTokenTime)}
        </span>
      )}
      {timing.tokenCount != null && (
        <span className="aui-message-timing-tokens">
          {timing.tokenCount} tokens
        </span>
      )}
      {timing.toolCallCount > 0 && (
        <span className="aui-message-timing-tools">
          {timing.toolCallCount} tool{timing.toolCallCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
};

MessageTimingRoot.displayName = "MessageTiming";

export { MessageTimingRoot as MessageTiming };
