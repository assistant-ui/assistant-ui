import { ConnectedScatter } from "diagrammatic";
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
      "The chart every model comparison ends on: each family is a series of test-time configs threaded through score-vs-cost space, standalone models are single labeled markers, and marker shape carries identity alongside color. Built with the `series` prop; shapes cycle circle, diamond, square, triangle.",
    read: "The atlas family dominates the frontier's left edge — more score per dollar at every config — while nova's thread flattens past $6: paying more stops buying capability. The lone solo marker sits above nova's whole curve at a third of the cost, which is the chart's headline.",
    chart: (
      <Report
        title="FrontierBench 1.1"
        chip="Score vs Cost ($)"
        note="Score: weighted aggregate of rubric items. Cost: mean USD per rollout."
      >
        <ConnectedScatter
          title="Score against cost per rollout"
          series={[
            {
              name: "atlas",
              points: [
                { x: 1.6, y: 30.5 },
                { x: 2.4, y: 36.6 },
                { x: 3.2, y: 40.5 },
                { x: 4.1, y: 43 },
              ],
            },
            {
              name: "nova",
              points: [
                { x: 2.5, y: 27.6 },
                { x: 3.6, y: 35.2 },
                { x: 5.1, y: 38.4 },
                { x: 6.9, y: 40.9 },
                { x: 9.4, y: 41.5 },
              ],
            },
            { name: "solo", points: [{ x: 2.1, y: 42.6 }] },
          ]}
          xLabel="avg cost (USD) per rollout"
          yLabel="score (%)"
        />
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
      </Paper>
    ),
  },
];
