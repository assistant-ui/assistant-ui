"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuiState } from "@assistant-ui/store";
import { SpanPrimitive, type SpanState } from "@assistant-ui/react-o11y";
import { WaterfallRow } from "./waterfall-row";

export const LABEL_WIDTH = 200;
const MAX_LIST_HEIGHT = 400;
const MIN_ZOOM = 1;
const MAX_ZOOM = 20;
const RIGHT_PADDING_RATIO = 0.08;

export const TYPE_COLORS: Record<string, string> = {
  action: "hsl(221 83% 53%)",
  api: "hsl(262 83% 58%)",
  tool: "hsl(142 71% 45%)",
  flow: "hsl(25 95% 53%)",
  pipeline: "hsl(340 75% 55%)",
};

export const FALLBACK_COLOR = "hsl(220 9% 46%)";

export type WaterfallLayoutContextValue = {
  barWidth: number;
  timeRange: { min: number; max: number };
  barHeight: number;
  contentWidth: number;
};

export const WaterfallLayoutContext =
  createContext<WaterfallLayoutContextValue | null>(null);

export function useWaterfallLayout(): WaterfallLayoutContextValue {
  const ctx = useContext(WaterfallLayoutContext);
  if (!ctx) {
    throw new Error(
      "useWaterfallLayout must be used within WaterfallLayoutContext",
    );
  }
  return ctx;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function TimeAxisTicks({
  timeRange,
  barWidth,
}: {
  timeRange: { min: number; max: number };
  barWidth: number;
}) {
  const duration = timeRange.max - timeRange.min;
  const tickCount = Math.min(5, Math.max(2, Math.floor(barWidth / 100)));
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const t = (i / tickCount) * duration;
    const x = (i / tickCount) * barWidth;
    return { t, x };
  });

  return (
    <svg
      aria-hidden="true"
      width={barWidth}
      height={28}
      className="overflow-visible"
    >
      {ticks.map(({ t, x }) => (
        <g key={x}>
          <line
            x1={x}
            y1={20}
            x2={x}
            y2={28}
            stroke="currentColor"
            className="text-border"
          />
          <text
            x={x}
            y={14}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {formatTime(t)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function WaterfallTimeline() {
  const outerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [baseBarWidth, setBaseBarWidth] = useState(400);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const baseBarWidthRef = useRef(400);
  const scrollAdjustRef = useRef<{
    mouseX: number;
    ratio: number;
  } | null>(null);

  const barWidth = Math.max(200, Math.round(baseBarWidth * zoom));

  const hasSpans = useAuiState((s) => s.span.hasChildren);
  const timeRange = useAuiState(
    (s) => s.span.timeRange,
  ) as SpanState["timeRange"];

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = Math.max(200, entry.contentRect.width - LABEL_WIDTH);
        baseBarWidthRef.current = w;
        setBaseBarWidth(w);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasSpans]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const mouseXInView = e.clientX - rect.left - LABEL_WIDTH;
      const mouseXInContent = el.scrollLeft + mouseXInView;
      const currentBarWidth = baseBarWidthRef.current * zoomRef.current;
      const ratio = currentBarWidth > 0 ? mouseXInContent / currentBarWidth : 0;

      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, zoomRef.current * 2 ** (-e.deltaY * 0.003)),
      );

      scrollAdjustRef.current = { mouseX: mouseXInView, ratio };
      zoomRef.current = newZoom;
      setZoom(newZoom);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [hasSpans]);

  useLayoutEffect(() => {
    const adj = scrollAdjustRef.current;
    const el = scrollRef.current;
    if (!adj || !el) return;
    scrollAdjustRef.current = null;

    const newBarX = adj.ratio * barWidth;
    el.scrollLeft = newBarX - adj.mouseX;
  }, [barWidth]);

  const renderTimeRange = useMemo(() => {
    const duration = timeRange.max - timeRange.min;
    return {
      min: timeRange.min,
      max: timeRange.max + duration * RIGHT_PADDING_RATIO,
    };
  }, [timeRange]);

  const contentWidth = LABEL_WIDTH + barWidth;
  const scrollMaxHeight = MAX_LIST_HEIGHT + 28;

  const layoutValue = useMemo(
    () => ({
      barWidth,
      timeRange: renderTimeRange,
      barHeight: 32,
      contentWidth,
    }),
    [barWidth, renderTimeRange, contentWidth],
  );

  if (!hasSpans) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border py-12 text-center text-sm">
        No spans recorded.
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className="border-border overflow-hidden rounded-lg border"
    >
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ maxHeight: scrollMaxHeight }}
      >
        <div
          className="border-border bg-background sticky top-0 z-20 flex border-b"
          style={{ width: contentWidth }}
        >
          <div
            className="border-border bg-background text-muted-foreground sticky left-0 z-30 shrink-0 border-r px-2 py-1.5 text-xs"
            style={{ width: LABEL_WIDTH }}
          >
            Span
          </div>
          <div style={{ width: barWidth, height: 28 }}>
            <TimeAxisTicks timeRange={renderTimeRange} barWidth={barWidth} />
          </div>
        </div>

        <WaterfallLayoutContext.Provider value={layoutValue}>
          <SpanPrimitive.Timeline
            timeRange={renderTimeRange}
            style={{ width: contentWidth }}
          >
            <SpanPrimitive.Children>
              {() => <WaterfallRow />}
            </SpanPrimitive.Children>
          </SpanPrimitive.Timeline>
        </WaterfallLayoutContext.Provider>
      </div>

      <div className="border-border text-muted-foreground flex items-center gap-4 border-t px-3 py-2 text-xs">
        {Object.entries(TYPE_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: color }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
