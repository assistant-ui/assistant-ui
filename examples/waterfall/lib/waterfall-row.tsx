"use client";

import { useAui, useAuiState } from "@assistant-ui/store";
import type { SpanItemState } from "@assistant-ui/react-o11y";
import { WaterfallBar } from "./waterfall-bar";

const LABEL_WIDTH = 200;
const ROW_HEIGHT = 32;

interface WaterfallRowProps {
  timeRange: { min: number; max: number };
  barWidth: number;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

export function WaterfallRow({
  timeRange,
  barWidth,
  selectedSpanId,
  onSelectSpan,
}: WaterfallRowProps) {
  const aui = useAui();
  const span = useAuiState((s) => s.span) as SpanItemState;
  const collapsedIds = useAuiState((s) => s.trace.collapsedIds) as string[];
  const isCollapsed = collapsedIds.includes(span.id);
  const isSelected = span.id === selectedSpanId;

  const scale = (t: number) => {
    const range = timeRange.max - timeRange.min || 1;
    return ((t - timeRange.min) / range) * barWidth;
  };

  const statusColor =
    span.status === "failed"
      ? "text-red-600"
      : span.status === "completed"
        ? "text-green-600"
        : span.status === "skipped"
          ? "text-muted-foreground"
          : "text-yellow-600";

  return (
    <div
      className={`group flex cursor-pointer items-center ${isSelected ? "bg-accent" : ""}`}
      style={{ width: LABEL_WIDTH + barWidth, height: ROW_HEIGHT }}
      onClick={() => onSelectSpan(span.id)}
    >
      {/* Label column */}
      <div
        className={`sticky left-0 z-10 flex shrink-0 items-center gap-1 overflow-hidden border-border border-r px-2 ${
          isSelected ? "bg-accent" : "bg-background group-hover:bg-accent/50"
        }`}
        style={{
          width: LABEL_WIDTH,
          height: ROW_HEIGHT,
          paddingLeft: 8 + span.depth * 12,
        }}
      >
        {span.hasChildren ? (
          <button
            type="button"
            className="flex shrink-0 items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              aui.trace().toggleCollapse(span.id);
            }}
          >
            <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
              {isCollapsed ? (
                <path d="M6 4l4 4-4 4V4z" />
              ) : (
                <path d="M4 6l4 4 4-4H4z" />
              )}
            </svg>
          </button>
        ) : (
          <span className="w-4.5 shrink-0" />
        )}
        <span
          className={`size-1.5 shrink-0 rounded-full bg-current ${statusColor}`}
        />
        <span className="shrink-0 rounded border border-border px-1 text-[10px] text-muted-foreground">
          {span.type}
        </span>
        <span className="truncate text-sm">{span.name}</span>
      </div>

      {/* Timeline bar */}
      <div
        className={!isSelected ? "group-hover:bg-accent/30" : ""}
        style={{ width: barWidth, height: ROW_HEIGHT }}
      >
        <svg width={barWidth} height={ROW_HEIGHT}>
          <WaterfallBar span={span} scale={scale} barHeight={ROW_HEIGHT} />
        </svg>
      </div>
    </div>
  );
}
