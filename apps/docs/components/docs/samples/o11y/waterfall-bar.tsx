"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { SpanItemState } from "@assistant-ui/react-o11y";
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

export function WaterfallBar() {
  const { barWidth, timeRange, barHeight } = useWaterfallLayout();
  const startedAt = useAuiState((s) => s.span.startedAt);
  const endedAt = useAuiState((s) => s.span.endedAt) as number | null;
  const status = useAuiState((s) => s.span.status) as SpanItemState["status"];
  const type = useAuiState((s) => s.span.type);

  const barRef = useRef<SVGRectElement>(null);

  const scale = useCallback(
    (t: number) => {
      const range = timeRange.max - timeRange.min || 1;
      return ((t - timeRange.min) / range) * barWidth;
    },
    [timeRange, barWidth],
  );

  const x = scale(startedAt);

  useEffect(() => {
    if (status !== "running") return;

    let frameId: number;
    const tick = () => {
      const width = scale(Date.now()) - x;
      barRef.current?.setAttribute("width", String(Math.max(0, width)));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [status, x, scale]);

  const rawWidth = endedAt !== null ? scale(endedAt) - x : 0;
  const width = Math.max(rawWidth, 4);
  const fill = TYPE_COLORS[type] ?? FALLBACK_COLOR;
  const opacity = STATUS_OPACITY[status];

  return (
    <g>
      <rect
        ref={barRef}
        x={x}
        y={4}
        width={width}
        height={barHeight - 8}
        rx={3}
        fill={fill}
        opacity={opacity}
        className={status === "running" ? "animate-pulse" : ""}
      />
      {status === "failed" && (
        <rect
          x={x}
          y={4}
          width={width}
          height={barHeight - 8}
          rx={3}
          fill="none"
          stroke="hsl(0 84% 60%)"
          strokeWidth={2}
        />
      )}
    </g>
  );
}
