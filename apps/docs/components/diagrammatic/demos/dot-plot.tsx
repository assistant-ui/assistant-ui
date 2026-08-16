import { DotPlot, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

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
];
