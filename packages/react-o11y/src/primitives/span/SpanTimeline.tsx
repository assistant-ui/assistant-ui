import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type CSSProperties,
  createContext,
  forwardRef,
  useContext,
  useMemo,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export type SpanTimelineRange = { min: number; max: number };

type TimelineCssProperties = CSSProperties & {
  "--span-timeline-min-ms"?: number;
  "--span-timeline-max-ms"?: number;
  "--span-timeline-range-ms"?: number;
  "--span-timeline-left"?: string;
  "--span-timeline-end"?: string;
  "--span-timeline-width"?: string;
  "--span-timeline-duration-ms"?: number;
  "--span-timeline-min-width"?: string | number;
};

const normalizeRange = (
  range: SpanTimelineRange,
  paddingEnd = 0,
): SpanTimelineRange => {
  const duration = Math.max(1, range.max - range.min);
  const safePaddingEnd = Math.max(0, paddingEnd);
  return {
    min: range.min,
    max: range.max + duration * safePaddingEnd,
  };
};

const SpanTimelineRangeContext = createContext<SpanTimelineRange | null>(null);

export namespace SpanPrimitiveTimeline {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    timeRange?: SpanTimelineRange | undefined;
    paddingEnd?: number | undefined;
  };
}

export const SpanPrimitiveTimeline = forwardRef<
  SpanPrimitiveTimeline.Element,
  SpanPrimitiveTimeline.Props
>(({ timeRange, paddingEnd = 0, style, children, ...props }, ref) => {
  const spanTimeRange = useAuiState((s) => s.span.timeRange);
  const resolvedRange = useMemo(
    () => normalizeRange(timeRange ?? spanTimeRange, paddingEnd),
    [timeRange, spanTimeRange, paddingEnd],
  );
  const rangeMs = Math.max(1, resolvedRange.max - resolvedRange.min);

  const mergedStyle: TimelineCssProperties = {
    ...style,
    "--span-timeline-min-ms": resolvedRange.min,
    "--span-timeline-max-ms": resolvedRange.max,
    "--span-timeline-range-ms": rangeMs,
  };

  return (
    <SpanTimelineRangeContext.Provider value={resolvedRange}>
      <Primitive.div
        {...props}
        ref={ref}
        style={mergedStyle}
        data-span-timeline=""
      >
        {children}
      </Primitive.div>
    </SpanTimelineRangeContext.Provider>
  );
});

SpanPrimitiveTimeline.displayName = "SpanPrimitive.Timeline";

export namespace SpanPrimitiveTimelineBar {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    now?: number | undefined;
    timeRange?: SpanTimelineRange | undefined;
  };
}

export const getSpanTimelineBarVars = ({
  startedAt,
  endedAt,
  timeRange,
  now,
}: {
  startedAt: number;
  endedAt: number | null;
  timeRange: SpanTimelineRange;
  now?: number | undefined;
}) => {
  const rangeMs = Math.max(1, timeRange.max - timeRange.min);
  const effectiveEnd = endedAt ?? now ?? timeRange.max;
  const leftPercent = ((startedAt - timeRange.min) / rangeMs) * 100;
  const rawEndPercent = ((effectiveEnd - timeRange.min) / rangeMs) * 100;
  const endPercent = Math.max(leftPercent, rawEndPercent);
  const widthPercent = endPercent - leftPercent;
  const durationMs = Math.max(0, effectiveEnd - startedAt);

  return {
    leftPercent,
    endPercent,
    widthPercent,
    durationMs,
    effectiveEnd,
  };
};

export const SpanPrimitiveTimelineBar = forwardRef<
  SpanPrimitiveTimelineBar.Element,
  SpanPrimitiveTimelineBar.Props
>(({ now, timeRange, style, ...props }, ref) => {
  const contextRange = useContext(SpanTimelineRangeContext);
  const spanTimeRange = useAuiState((s) => s.span.timeRange);
  const startedAt = useAuiState((s) => s.span.startedAt);
  const endedAt = useAuiState((s) => s.span.endedAt);
  const status = useAuiState((s) => s.span.status);
  const type = useAuiState((s) => s.span.type);

  const vars = getSpanTimelineBarVars({
    startedAt,
    endedAt,
    timeRange: timeRange ?? contextRange ?? spanTimeRange,
    now,
  });

  const mergedStyle: TimelineCssProperties = {
    ...style,
    position: "absolute",
    insetInlineStart: "var(--span-timeline-left)",
    inlineSize:
      "max(var(--span-timeline-width), var(--span-timeline-min-width, 0px))",
    "--span-timeline-left": `${vars.leftPercent}%`,
    "--span-timeline-end": `${vars.endPercent}%`,
    "--span-timeline-width": `${vars.widthPercent}%`,
    "--span-timeline-duration-ms": vars.durationMs,
  };

  return (
    <Primitive.div
      {...props}
      ref={ref}
      style={mergedStyle}
      data-span-status={status}
      data-span-type={type}
      data-span-running={endedAt === null ? "" : undefined}
    />
  );
});

SpanPrimitiveTimelineBar.displayName = "SpanPrimitive.TimelineBar";
