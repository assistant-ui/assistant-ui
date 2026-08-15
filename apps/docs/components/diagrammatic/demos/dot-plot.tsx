import { DotPlot, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Median salary by role",
    note: "Dots on a shared axis; the even spacing between levels is itself the finding.",
    chart: (
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
    ),
  },
  {
    title: "Life expectancy by region",
    note: "The whole spread fits in fifteen years; a zero baseline would bury it.",
    chart: (
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
    ),
  },
  {
    title: "Top speed of five runners",
    note: "The cheetah needs its own margin; the human dot is the humbling one.",
    chart: (
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
    ),
  },
];
