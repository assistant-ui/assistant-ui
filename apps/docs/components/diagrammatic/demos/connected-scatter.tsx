import { ConnectedScatter } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Paper, Report } from "./scenes";

export const glyph = (
  <ConnectedScatter
    title="Inflation against unemployment"
    points={[
      { x: 3.9, y: 2.4, label: "2018" },
      { x: 3.7, y: 1.8 },
      { x: 8.1, y: 1.2 },
      { x: 5.4, y: 4.7 },
      { x: 3.6, y: 8 },
      { x: 3.5, y: 4.1 },
      { x: 3.9, y: 3.1 },
      { x: 4.1, y: 2.7, label: "2025" },
    ]}
    xLabel="unemployment %"
    yLabel="inflation %"
  />
);

export const examples: DemoExample[] = [
  {
    title: "The frontier chart: score against cost, families as threads",
    setup:
      "The chart every model comparison ends on, at full spec: family curves and solo markers in score-vs-cost space, a ticked grid on both axes, the x axis reversed so cheaper sits to the right, and a dashed cross pinning the headline point to both scales. Every element is a data prop: `series`, `xTicks`, `yTicks`, `reverseX`, `refPoint`.",
    read: "Cost falls to the right, so the prize corner is top-right — and swift's cross-haired marker owns it: 45.8 at $1.90, pinned to both axes by the reference cross. atlas-1 holds the crown at 46.6 but pays $9.60 for it, out on the expensive left edge; nova's curve beats atlas-0 at every shared price, and the ticks make each claim checkable without leaving the figure.",
    chart: (
      <Report
        title="FrontierBench 1.1"
        chip="Score vs Cost ($)"
        note="Score: weighted aggregate of rubric items. Cost: mean USD per rollout. Cost axis reversed: right is cheaper."
      >
        <FigTooltip
          solo
          highlight="series"
          series={{
            "atlas-1": [
              "$2.40 · 35.1",
              "$3.10 · 38.6",
              "$3.70 · 40.4",
              "$4.30 · 41.0",
              "$5.40 · 43.2",
              "$6.80 · 45.5",
              "$9.60 · 46.6",
            ],
            nova: [
              "$1.70 · 30.5",
              "$2.20 · 34.1",
              "$2.60 · 36.6",
              "$3.30 · 40.5",
              "$4.10 · 43.0",
              "$5.00 · 44.1",
            ],
            "atlas-0": [
              "$2.50 · 27.6",
              "$3.20 · 28.9",
              "$4.10 · 31.8",
              "$5.10 · 35.2",
              "$6.00 · 35.6",
              "$6.90 · 34.9",
              "$9.10 · 38.6",
            ],
            swift: ["$1.90 · 45.8"],
            quill: ["$3.10 · 31.6"],
            pico: ["$3.40 · 26.2"],
            glacier: ["$2.90 · 24.5"],
          }}
        >
          <ConnectedScatter
            title="Score against cost per rollout"
            reverseX
            series={[
              {
                name: "atlas-1",
                points: [
                  { x: 2.4, y: 35.1 },
                  { x: 3.1, y: 38.6 },
                  { x: 3.7, y: 40.4 },
                  { x: 4.3, y: 41.0 },
                  { x: 5.4, y: 43.2 },
                  { x: 6.8, y: 45.5 },
                  { x: 9.6, y: 46.6 },
                ],
              },
              {
                name: "nova",
                points: [
                  { x: 1.7, y: 30.5 },
                  { x: 2.2, y: 34.1 },
                  { x: 2.6, y: 36.6 },
                  { x: 3.3, y: 40.5 },
                  { x: 4.1, y: 43.0 },
                  { x: 5.0, y: 44.1 },
                ],
              },
              {
                name: "atlas-0",
                points: [
                  { x: 2.5, y: 27.6 },
                  { x: 3.2, y: 28.9 },
                  { x: 4.1, y: 31.8 },
                  { x: 5.1, y: 35.2 },
                  { x: 6.0, y: 35.6 },
                  { x: 6.9, y: 34.9 },
                  { x: 9.1, y: 38.6 },
                ],
              },
              { name: "swift", points: [{ x: 1.9, y: 45.8 }] },
              { name: "quill", points: [{ x: 3.1, y: 31.6 }] },
              { name: "pico", points: [{ x: 3.4, y: 26.2 }] },
              { name: "glacier", points: [{ x: 2.9, y: 24.5 }] },
            ]}
            xTicks={[
              { at: 4, label: "$4" },
              { at: 6, label: "$6" },
              { at: 8, label: "$8" },
              { at: 10, label: "$10" },
            ]}
            yTicks={[
              { at: 25, label: "25" },
              { at: 30, label: "30" },
              { at: 35, label: "35" },
              { at: 40, label: "40" },
            ]}
            refPoint={{
              x: 1.9,
              y: 45.8,
              xLabel: "$1.90",
              yLabel: "45.8",
              label: "(best value)",
            }}
            xLabel="avg cost (USD) per rollout"
            yLabel="score (%)"
          />
        </FigTooltip>
      </Report>
    ),
  },
  {
    title: "Inflation against unemployment, 2018 to 2025",
    setup:
      "An economics desk plots the two macro variables every central banker stares at — but instead of two time series, it threads the years through one plane. Time rides the path, not an axis.",
    read: "The loop is the whole story: out to the pandemic corner, up through the inflation spike, and back to almost exactly where 2018 stood. Seven dramatic years that netted out to a round trip — a shape no pair of line charts can draw.",
    chart: (
      <Paper
        kicker="Economy"
        title="The loop, 2018–2025"
        source="Source: bureau of labor statistics"
      >
        <FigTooltip
          labels={[
            "2018",
            "2019",
            "2020",
            "2021",
            "2022",
            "2023",
            "2024",
            "2025",
          ]}
          series={{
            "unemployment %": [3.9, 3.7, 8.1, 5.4, 3.6, 3.5, 3.9, 4.1],
            "inflation %": [2.4, 1.8, 1.2, 4.7, 8, 4.1, 3.1, 2.7],
          }}
        >
          <ConnectedScatter
            title="Inflation against unemployment"
            points={[
              { x: 3.9, y: 2.4, label: "2018" },
              { x: 3.7, y: 1.8 },
              { x: 8.1, y: 1.2 },
              { x: 5.4, y: 4.7 },
              { x: 3.6, y: 8 },
              { x: 3.5, y: 4.1 },
              { x: 3.9, y: 3.1 },
              { x: 4.1, y: 2.7, label: "2025" },
            ]}
            xLabel="unemployment %"
            yLabel="inflation %"
          />
        </FigTooltip>
      </Paper>
    ),
  },
];
