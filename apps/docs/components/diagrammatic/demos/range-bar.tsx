import { RangeBar, formatCompact } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const BANDS = [
  { label: "intern", from: 38_000, to: 52_000, at: 44_000 },
  { label: "junior", from: 62_000, to: 84_000, at: 71_000 },
  { label: "mid", from: 86_000, to: 118_000, at: 99_000 },
  { label: "senior", from: 128_000, to: 168_000, at: 146_000 },
  { label: "staff", from: 158_000, to: 204_000, at: 178_000 },
  { label: "principal", from: 188_000, to: 236_000, at: 208_000 },
  { label: "em", from: 142_000, to: 188_000, at: 164_000 },
  { label: "director", from: 196_000, to: 248_000, at: 218_000 },
];

export const glyph = (
  <RangeBar
    title="Offer bands"
    items={BANDS.slice(0, 5)}
    format={(v) => `$${formatCompact(v)}`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Closed offer bands, last two quarters",
    setup:
      "Compensation review. Each row is the p25 to p75 cash band of a closed role, the tick is the median we actually paid. The question is where the ladder overlaps.",
    read: "Staff's floor sits inside senior's ceiling. An EM offer can land below staff. Director starts where principal's median is. The overlaps are the calibration meeting, not the medians.",
    source: "Closed US cash offers, Oct 2024 to Mar 2025. n = 214.",
    chart: (
      <FigTooltip
        labels={BANDS.map((row) => row.label)}
        series={{
          p25: BANDS.map((row) => row.from),
          median: BANDS.map((row) => row.at ?? row.from),
          p75: BANDS.map((row) => row.to),
        }}
      >
        <RangeBar
          density="figure"
          aspect={1.35}
          title="Closed offer bands"
          items={BANDS}
          xTicks={[
            { at: 50_000, label: "50k" },
            { at: 125_000, label: "125k" },
            { at: 200_000, label: "200k" },
          ]}
          format={(v) => `$${formatCompact(v)}`}
        />
      </FigTooltip>
    ),
  },
];
