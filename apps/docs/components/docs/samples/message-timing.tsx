"use client";

import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { cn } from "@/lib/utils";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function MessageTimingDemo({
  label,
  timing,
}: {
  label: string;
  timing: {
    totalStreamTime?: number;
    tokensPerSecond?: number;
    firstTokenTime?: number;
    tokenCount?: number;
    toolCallCount: number;
  };
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs",
        )}
      >
        {timing.totalStreamTime != null && (
          <span>{formatDuration(timing.totalStreamTime)}</span>
        )}
        {timing.tokensPerSecond != null && (
          <span>{timing.tokensPerSecond.toFixed(1)} tok/s</span>
        )}
        {timing.firstTokenTime != null && (
          <span>TTFT {formatDuration(timing.firstTokenTime)}</span>
        )}
        {timing.tokenCount != null && <span>{timing.tokenCount} tokens</span>}
        {timing.toolCallCount > 0 && (
          <span>
            {timing.toolCallCount} tool{timing.toolCallCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export function MessageTimingSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-6 p-6">
      <MessageTimingDemo
        label="Text response"
        timing={{
          totalStreamTime: 2340,
          tokensPerSecond: 58.3,
          firstTokenTime: 180,
          tokenCount: 136,
          toolCallCount: 0,
        }}
      />
      <MessageTimingDemo
        label="With tool calls"
        timing={{
          totalStreamTime: 5120,
          tokensPerSecond: 42.1,
          firstTokenTime: 320,
          tokenCount: 215,
          toolCallCount: 2,
        }}
      />
      <MessageTimingDemo
        label="Fast response"
        timing={{
          totalStreamTime: 890,
          tokensPerSecond: 112.5,
          firstTokenTime: 45,
          tokenCount: 100,
          toolCallCount: 0,
        }}
      />
    </SampleFrame>
  );
}
