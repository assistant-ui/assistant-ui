import { DotPlot, formatCompact } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

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
    title: "Median salary by role, with n",
    setup:
      "A compensation review lays the ladder on one axis. Dots, not bars, because the gaps are the finding. Each label carries the sample behind the median.",
    read: "Intern through staff still steps about $24k to $30k. Then the ladder compresses: principal is only $26k above staff, distinguished another $18k. An EM sits between senior and staff; a director sits on principal. PM tracks mid, not senior.",
    source:
      "Cash compensation, US engineering and product, April 2025 band. n = 486.",
    chart: (
      <FigTooltip
        labels={[
          "distinguished · n=6",
          "director · n=11",
          "principal · n=28",
          "staff · n=64",
          "em · n=19",
          "senior · n=112",
          "pm · n=41",
          "mid · n=98",
          "junior · n=74",
          "intern · n=33",
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
          density="figure"
          aspect={1.2}
          title="Median salary by role"
          items={[
            { label: "distinguished · n=6", value: 222_000 },
            { label: "director · n=11", value: 208_000 },
            { label: "principal · n=28", value: 204_000 },
            { label: "staff · n=64", value: 178_000 },
            { label: "em · n=19", value: 162_000 },
            { label: "senior · n=112", value: 148_000 },
            { label: "pm · n=41", value: 126_000 },
            { label: "mid · n=98", value: 118_000 },
            { label: "junior · n=74", value: 88_000 },
            { label: "intern · n=33", value: 64_000 },
          ]}
          ticks={[100_000, 150_000, 200_000]}
          highlight="em · n=19"
          format={(v) => `$${formatCompact(v)}`}
        />
      </FigTooltip>
    ),
  },
];
