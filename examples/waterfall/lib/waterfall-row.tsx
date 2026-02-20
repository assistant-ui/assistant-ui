"use client";

import { SpanPrimitive } from "@assistant-ui/react-o11y";
import { AuiIf } from "@assistant-ui/store";
import { WaterfallBar } from "./waterfall-bar";
import { useWaterfallLayout } from "./waterfall-timeline";

const LABEL_WIDTH = 200;

export function WaterfallRow() {
  const { barWidth, contentWidth, barHeight } = useWaterfallLayout();

  return (
    <SpanPrimitive.Root
      className="group flex cursor-pointer items-center"
      style={{ width: contentWidth, height: barHeight }}
    >
      <SpanPrimitive.Indent
        baseIndent={8}
        indentPerLevel={12}
        className="sticky left-0 z-10 flex shrink-0 items-center gap-1 overflow-hidden border-border border-r bg-background px-2 group-hover:bg-accent/50"
        style={{ width: LABEL_WIDTH, height: barHeight }}
      >
        <AuiIf condition={(s) => s.span.hasChildren}>
          <SpanPrimitive.CollapseToggle className="flex shrink-0 items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground">
            <svg
              className="size-3.5 transition-transform data-[collapsed=true]:[-rotate-90]"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M4 6l4 4 4-4H4z" />
            </svg>
          </SpanPrimitive.CollapseToggle>
        </AuiIf>
        <AuiIf condition={(s) => !s.span.hasChildren}>
          <span className="w-4.5 shrink-0" />
        </AuiIf>
        <SpanPrimitive.StatusIndicator className="size-1.5 shrink-0 rounded-full bg-current" />
        <SpanPrimitive.TypeBadge className="shrink-0 rounded border border-border px-1 text-[10px] text-muted-foreground" />
        <SpanPrimitive.Name className="truncate text-sm" />
      </SpanPrimitive.Indent>

      {/* Timeline bar */}
      <div
        className="group-hover:bg-accent/30"
        style={{ width: barWidth, height: barHeight }}
      >
        <svg width={barWidth} height={barHeight}>
          <WaterfallBar />
        </svg>
      </div>
    </SpanPrimitive.Root>
  );
}
