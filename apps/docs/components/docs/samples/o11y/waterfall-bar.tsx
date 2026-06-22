"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useAuiState } from "@assistant-ui/store";
import { SpanPrimitive, type SpanItemState } from "@assistant-ui/react-o11y";
import {
  FALLBACK_COLOR,
  TYPE_COLORS,
  useWaterfallLayout,
} from "./waterfall-timeline";

const STATUS_OPACITY: Record<SpanItemState["status"], number> = {
  running: 0.7,
  completed: 1,
  failed: 1,
  skipped: 0.5,
};

function useRunningNow(enabled: boolean) {
  const [now, setNow] = useState<number>();

  useEffect(() => {
    if (!enabled) {
      setNow(undefined);
      return;
    }

    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [enabled]);

  return now;
}

export function WaterfallBar() {
  const { barHeight } = useWaterfallLayout();
  const status = useAuiState((s) => s.span.status) as SpanItemState["status"];
  const type = useAuiState((s) => s.span.type);
  const fill = TYPE_COLORS[type] ?? FALLBACK_COLOR;
  const opacity = STATUS_OPACITY[status];
  const now = useRunningNow(status === "running");

  return (
    <SpanPrimitive.TimelineBar
      now={now}
      className={status === "running" ? "animate-pulse" : ""}
      style={
        {
          "--span-timeline-min-width": "4px",
          top: 4,
          height: barHeight - 8,
          borderRadius: 3,
          background: fill,
          opacity,
          boxShadow:
            status === "failed" ? "inset 0 0 0 2px hsl(0 84% 60%)" : undefined,
        } as CSSProperties & { "--span-timeline-min-width": string }
      }
    />
  );
}
