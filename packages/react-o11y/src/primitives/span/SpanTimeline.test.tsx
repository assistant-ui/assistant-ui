import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
}: {
  paddingEnd?: number | undefined;
  now?: number | undefined;
}) => {
  const aui = useAui({ span: SpanResource({ spans }) });

  return (
    <AuiProvider value={aui}>
      <SpanPrimitive.Timeline paddingEnd={paddingEnd}>
        <SpanPrimitive.Children>
          {() => <SpanPrimitive.TimelineBar now={now} />}
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

  it("provides the padded timeline range to child bars", () => {
    const html = renderToStaticMarkup(<TimelineFixture paddingEnd={1} />);

    expect(html).toContain("data-span-timeline");
    expect(html).toContain("--span-timeline-range-ms:200");
    expect(html).toContain("--span-timeline-width:50%");
    expect(html).toContain('data-span-status="completed"');
    expect(html).toContain('data-span-type="http"');
  });
});
