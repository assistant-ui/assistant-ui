"use client";

import { useEffect, useRef } from "react";
import type { SpanItemState } from "@assistant-ui/react-o11y";

const TYPE_COLORS: Record<string, string> = {
  action: "hsl(221 83% 53%)",
  api: "hsl(262 83% 58%)",
  tool: "hsl(142 71% 45%)",
  flow: "hsl(25 95% 53%)",
  pipeline: "hsl(340 75% 55%)",
};

const FALLBACK_COLOR = "hsl(220 9% 46%)";

const STATUS_OPACITY: Record<SpanItemState["status"], number> = {
  running: 0.7,
  completed: 1,
  failed: 1,
  skipped: 0.5,
};

interface WaterfallBarProps {
  span: SpanItemState;
  scale: (t: number) => number;
  barHeight: number;
}

export function WaterfallBar({ span, scale, barHeight }: WaterfallBarProps) {
  const barRef = useRef<SVGRectElement>(null);
  const x = scale(span.startedAt);

  useEffect(() => {
    if (span.status !== "running") return;

    let frameId: number;
    const tick = () => {
      const width = scale(Date.now()) - x;
      barRef.current?.setAttribute("width", String(Math.max(0, width)));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [span.status, x, scale]);

  const rawWidth = span.endedAt ? scale(span.endedAt) - x : 0;
  const width = Math.max(rawWidth, 4);
  const fill = TYPE_COLORS[span.type] ?? FALLBACK_COLOR;
  const opacity = STATUS_OPACITY[span.status];

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
        className={span.status === "running" ? "animate-pulse" : ""}
      />
      {span.status === "failed" && (
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
