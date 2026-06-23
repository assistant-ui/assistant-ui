import type { CSSProperties } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import * as SpanPrimitive from "../span";
import { SpanResource, type SpanData } from "../../resources/SpanResource";
import { getSpanTimelineBarVars } from "./SpanTimeline";

const spans: SpanData[] = [
  {
    id: "root",
    parentSpanId: null,
    name: "request",
    type: "http",
    status: "completed",
    startedAt: 0,
    endedAt: 100,
    latencyMs: 100,
  },
];

const TimelineFixture = ({
  paddingEnd,
  now,
  barStyle,
}: {
  paddingEnd?: number | undefined;
  now?: number | undefined;
  barStyle?: CSSProperties | undefined;
}) => {
  const aui = useAui({ span: SpanResource({ spans }) });

  return (
    <AuiProvider value={aui}>
      <SpanPrimitive.Timeline paddingEnd={paddingEnd}>
        <SpanPrimitive.Children>
          {() => <SpanPrimitive.TimelineBar now={now} style={barStyle} />}
        </SpanPrimitive.Children>
      </SpanPrimitive.Timeline>
    </AuiProvider>
  );
};

const runningSpans: SpanData[] = [
  {
    id: "root",
    parentSpanId: null,
    name: "request",
    type: "http",
    status: "running",
    startedAt: 0,
    endedAt: null,
    latencyMs: null,
  },
];

const RunningFixture = () => {
  const aui = useAui({ span: SpanResource({ spans: runningSpans }) });

  return (
    <AuiProvider value={aui}>
      <SpanPrimitive.Timeline timeRange={{ min: 0, max: 100 }}>
        <SpanPrimitive.Children>
          {() => <SpanPrimitive.TimelineBar />}
        </SpanPrimitive.Children>
      </SpanPrimitive.Timeline>
    </AuiProvider>
  );
};

describe("SpanPrimitive.Timeline", () => {
  it("computes stable timeline percentages for completed spans", () => {
    expect(
      getSpanTimelineBarVars({
        startedAt: 25,
        endedAt: 75,
        timeRange: { min: 0, max: 100 },
      }),
    ).toMatchObject({
      leftPercent: 25,
      endPercent: 75,
      widthPercent: 50,
      durationMs: 50,
      effectiveEnd: 75,
    });
  });

  it("uses now for running spans without producing negative widths", () => {
    expect(
      getSpanTimelineBarVars({
        startedAt: 100,
        endedAt: null,
        timeRange: { min: 0, max: 200 },
        now: 80,
      }),
    ).toMatchObject({
      leftPercent: 50,
      endPercent: 50,
      widthPercent: 0,
      durationMs: 0,
      effectiveEnd: 80,
    });
  });

  it("uses the range boundary for running spans when now is omitted", () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(1_000);

    expect(
      getSpanTimelineBarVars({
        startedAt: 25,
        endedAt: null,
        timeRange: { min: 0, max: 100 },
      }),
    ).toMatchObject({
      leftPercent: 25,
      endPercent: 100,
      widthPercent: 75,
      durationMs: 75,
      effectiveEnd: 100,
    });
    expect(dateNow).not.toHaveBeenCalled();

    dateNow.mockRestore();
  });

  it("clamps bar geometry to the timeline when now or startedAt fall outside the range", () => {
    expect(
      getSpanTimelineBarVars({
        startedAt: 25,
        endedAt: null,
        timeRange: { min: 0, max: 100 },
        now: 10_000,
      }),
    ).toMatchObject({
      leftPercent: 25,
      endPercent: 100,
      widthPercent: 75,
      effectiveEnd: 10_000,
    });

    expect(
      getSpanTimelineBarVars({
        startedAt: -50,
        endedAt: 50,
        timeRange: { min: 0, max: 100 },
      }),
    ).toMatchObject({
      leftPercent: 0,
      endPercent: 50,
      widthPercent: 50,
    });
  });

  it("provides the padded timeline range to child bars", () => {
    const html = renderToStaticMarkup(<TimelineFixture paddingEnd={1} />);

    expect(html).toContain("data-span-timeline");
    expect(html).toContain("--span-timeline-range-ms:200");
    expect(html).toContain("--span-timeline-width:50%");
    expect(html).toContain('data-span-status="completed"');
    expect(html).toContain('data-span-type="http"');
  });

  it("marks running bars with data-span-running and omits it for completed spans", () => {
    expect(renderToStaticMarkup(<RunningFixture />)).toContain(
      "data-span-running",
    );
    expect(renderToStaticMarkup(<TimelineFixture />)).not.toContain(
      "data-span-running",
    );
  });

  it("passes a consumer --span-timeline-min-width through to the bar style", () => {
    const html = renderToStaticMarkup(
      <TimelineFixture
        barStyle={{ "--span-timeline-min-width": "4px" } as CSSProperties}
      />,
    );

    expect(html).toContain("--span-timeline-min-width:4px");
    expect(html).toContain("position:absolute");
  });

  it("clamps a negative paddingEnd and leaves the default range unpadded", () => {
    expect(renderToStaticMarkup(<TimelineFixture paddingEnd={-1} />)).toContain(
      "--span-timeline-range-ms:100",
    );
    expect(renderToStaticMarkup(<TimelineFixture />)).toContain(
      "--span-timeline-range-ms:100",
    );
  });
});
