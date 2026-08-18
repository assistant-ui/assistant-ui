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
          guides={[{ at: 150_000, label: "staff floor" }]}
          format={(v) => `$${formatCompact(v)}`}
        />
      </FigTooltip>
    ),
  },
  {
    title: "Hazard ratio, eight trials",
    setup:
      "A forest of published estimates. Each row is a trial's hazard ratio with a 95% interval. The tick is the point estimate. The guide is no effect.",
    read: "Six of eight sit left of 1. The pooled row at the bottom is 0.72, and its interval still clears the null. Trial D is the one that would flip a naive vote.",
    source: "Investigator-assessed PFS, random-effects pool.",
    chart: (
      <RangeBar
        density="figure"
        aspect={1.35}
        title="Hazard ratio vs control"
        items={[
          { label: "A", from: 0.48, to: 0.92, at: 0.66 },
          { label: "B", from: 0.55, to: 1.05, at: 0.76 },
          { label: "C", from: 0.41, to: 0.84, at: 0.59 },
          { label: "D", from: 0.88, to: 1.46, at: 1.13 },
          { label: "E", from: 0.52, to: 0.98, at: 0.71 },
          { label: "F", from: 0.61, to: 1.12, at: 0.83 },
          { label: "G", from: 0.44, to: 0.89, at: 0.63 },
          { label: "pooled", from: 0.58, to: 0.89, at: 0.72 },
        ]}
        xTicks={[
          { at: 0.5, label: "0.5" },
          { at: 1, label: "1" },
          { at: 1.5, label: "1.5" },
        ]}
        guides={[{ at: 1, label: "null" }]}
        format={(v) => v.toFixed(2)}
      />
    ),
  },
];
