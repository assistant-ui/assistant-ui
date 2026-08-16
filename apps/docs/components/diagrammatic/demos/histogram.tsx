import { Histogram } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const BINS = [
  12, 28, 54, 96, 148, 212, 268, 244, 186, 132, 88, 56, 34, 22, 14, 9, 6, 4,
];
const LAST_WEEK = [
  18, 36, 72, 124, 188, 246, 274, 228, 164, 108, 70, 44, 26, 16, 10, 6, 3, 2,
];

export const glyph = (
  <Histogram
    title="Checkout latency"
    bins={BINS.slice(0, 12)}
    labels={["0", "400ms", "800ms"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Checkout POST, one Wednesday",
    setup:
      "Eighteen 50ms bins, one day of traffic. The dashed outline is the same weekday a week earlier. The shape is the regression; the median is the alibi.",
    read: "The mass still sits near 350ms, but the right tail past 700ms has thickened since last Wednesday. That is the inventory query from the icicle, counted. The marker at 392ms would have called the day fine.",
    source: "Checkout POST, 13 Aug 2025. n = 18,420. Compare = 6 Aug.",
    chart: (
      <FigTooltip series={{ "13 Aug": BINS, "6 Aug": LAST_WEEK }}>
        <Histogram
          density="figure"
          aspect={2.1}
          title="Checkout POST latency"
          bins={BINS}
          compare={LAST_WEEK}
          marker={{ at: 6.8, label: "median 392ms" }}
          labels={["0", "200", "400", "600", "800"]}
        />
      </FigTooltip>
    ),
  },
];
