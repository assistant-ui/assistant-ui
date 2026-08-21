"use client";

import { SpanPrimitive } from "@assistant-ui/react-o11y";
import { AuiIf } from "@assistant-ui/store";
import { WaterfallBar } from "./waterfall-bar";
import { LABEL_WIDTH, useWaterfallLayout } from "./waterfall-timeline";

export function WaterfallRow() {
  const { barWidth, contentWidth, barHeight } = useWaterfallLayout();

  return (
    <SpanPrimitive.Root
      className="group flex items-center"
      style={{ width: contentWidth, height: barHeight }}
    >
      <SpanPrimitive.Indent
        baseIndent={8}
        indentPerLevel={12}
        className="border-border bg-background group-hover:bg-accent/50 sticky left-0 z-10 flex shrink-0 items-center gap-1 overflow-hidden border-r px-2"
        style={{ width: LABEL_WIDTH, height: barHeight }}
      >
        <AuiIf condition={(s) => s.span.hasChildren}>
          <SpanPrimitive.CollapseToggle className="text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center rounded p-0.5 [&_svg]:transition-transform data-[collapsed=true]:[&_svg]:-rotate-90">
            <svg
              aria-hidden="true"
              className="size-3.5"
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
        <SpanPrimitive.TypeBadge className="border-border text-muted-foreground shrink-0 rounded border px-1 text-[10px]" />
        <SpanPrimitive.Name className="truncate text-sm" />
      </SpanPrimitive.Indent>

      <div
        className="group-hover:bg-accent/30 relative"
        style={{ width: barWidth, height: barHeight }}
      >
        <WaterfallBar />
      </div>
    </SpanPrimitive.Root>
  );
}
