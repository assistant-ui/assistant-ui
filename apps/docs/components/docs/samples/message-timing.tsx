"use client";

import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function MessageTimingSample() {
  return (
    <SampleFrame className="flex h-auto items-start justify-center gap-10 p-8">
      {/* Badge as it appears in the action bar */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">Badge</span>
        <button
          type="button"
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center rounded-md p-1 font-mono text-xs tabular-nums transition-colors"
        >
          1.23s
        </button>
      </div>

      {/* Tooltip content as it appears on hover */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">On hover</span>
        <div className="bg-popover text-popover-foreground grid min-w-35 gap-1.5 rounded-lg border px-3 py-2 text-xs shadow-md">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">First token</span>
            <span className="font-mono tabular-nums">312ms</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono tabular-nums">1.23s</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Speed</span>
            <span className="font-mono tabular-nums">82.5 tok/s</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Chunks</span>
            <span className="font-mono tabular-nums">47</span>
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}
