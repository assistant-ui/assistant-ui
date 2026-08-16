import { DotPlot, formatCompact } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
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
    read: "The spacing is the finding: $24–30k per promotion holds from intern through staff, then the ladder compresses — principal buys $26k but distinguished only $18k more. The parallel tracks tell the other story: an em sits between senior and staff, a director between principal and distinguished, and pm tracks mid-senior almost exactly.",
    chart: (
      <Report
        title="Median salary by role"
        chip="levels"
        note="Medians across the engineering ladder, base salary only."
      >
        <FigTooltip
          labels={[
            "distinguished",
            "director",
            "principal",
            "staff",
            "em",
            "senior",
            "pm",
            "mid",
            "junior",
            "intern",
          ]}
          series={{
            median: [
              "$222k",
              "$208k",
              "$204k",
              "$178k",
              "$162k",
              "$148k",
              "$126k",
              "$118k",
              "$88k",
              "$64k",
            ],
          }}
        >
          <DotPlot
            title="Median salary by role"
            items={[
              { label: "distinguished", value: 222_000 },
              { label: "director", value: 208_000 },
              { label: "principal", value: 204_000 },
              { label: "staff", value: 178_000 },
              { label: "em", value: 162_000 },
              { label: "senior", value: 148_000 },
              { label: "pm", value: 126_000 },
              { label: "mid", value: 118_000 },
              { label: "junior", value: 88_000 },
              { label: "intern", value: 64_000 },
            ]}
            ticks={[100_000, 150_000, 200_000]}
            highlight="em"
            format={(v) => `$${formatCompact(v)}`}
          />
        </FigTooltip>
      </Report>
    ),
  },
];
