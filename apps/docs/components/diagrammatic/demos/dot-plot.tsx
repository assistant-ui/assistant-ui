import { DotPlot, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report } from "./scenes";

export const glyph = (
  <DotPlot
    title="Median salary by role"
    items={[
      { label: "staff", value: 176_000 },
      { label: "senior", value: 144_000 },
      { label: "pm", value: 122_000 },
      { label: "mid", value: 94_000 },
      { label: "junior", value: 68_000 },
      { label: "intern", value: 44_000 },
    ]}
    ticks={[50_000, 100_000, 150_000]}
    format={(v) => `$${formatCompact(v)}`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Median salary by role",
    setup:
      "A compensation review lays the ladder on one axis: median salary per level, dots on a shared scale with reference ticks. No bars, because the differences matter more than the totals.",
    read: "The even spacing between levels is itself the finding — roughly $30k per promotion, held almost perfectly from intern to staff. If one gap were compressed, this chart is where a leveling problem would first show.",
    chart: (
      <Report
        title="Median salary by role"
        chip="levels"
        note="Medians across the engineering ladder, base salary only."
      >
        <DotPlot
          title="Median salary by role"
          items={[
            { label: "staff", value: 176_000 },
            { label: "senior", value: 144_000 },
            { label: "pm", value: 122_000 },
            { label: "mid", value: 94_000 },
            { label: "junior", value: 68_000 },
            { label: "intern", value: 44_000 },
          ]}
          ticks={[50_000, 100_000, 150_000]}
          format={(v) => `$${formatCompact(v)}`}
        />
      </Report>
    ),
  },
  {
    title: "Life expectancy by region",
    setup:
      "A global-health explainer compares life expectancy across regions. The whole spread fits inside fifteen years, so the chart starts the axis where the data lives.",
    read: "Europe and Africa bracket a seventeen-year gap with everyone else packed between 73 and 81. On a zero baseline this spread would flatten into nothing; the dot plot's non-zero axis is what makes the inequality legible.",
    chart: (
      <Paper
        kicker="Global health"
        title="A fifteen-year spread"
        source="Source: WHO life tables"
      >
        <DotPlot
          title="Life expectancy"
          items={[
            { label: "europe", value: 81 },
            { label: "oceania", value: 79 },
            { label: "americas", value: 77 },
            { label: "asia", value: 74 },
            { label: "world", value: 73 },
            { label: "africa", value: 64 },
          ]}
          ticks={[65, 70, 75, 80]}
          format={(v) => `${v}y`}
        />
      </Paper>
    ),
  },
  {
    title: "Top speed of five runners",
    setup:
      "A science-museum panel puts five sprinters on one axis, from house pet to savanna. Dots, because the point is where each animal sits, not how much area it fills.",
    read: "The cheetah needs its own margin at 112 km/h, and the human dot is the humbling one — barely a third of the leader, edged out by a greyhound. Kids find their species instantly; that findability is the dot plot working.",
    chart: (
      <AppCard title="Top speed" meta="km/h">
        <DotPlot
          title="Top speed"
          items={[
            { label: "cheetah", value: 112 },
            { label: "pronghorn", value: 88 },
            { label: "greyhound", value: 72 },
            { label: "horse", value: 70 },
            { label: "human", value: 37 },
          ]}
          ticks={[40, 70, 100]}
          format={(v) => `${v} km/h`}
        />
      </AppCard>
    ),
  },
];
