import { DivergingStacked } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const ROWS = [
  {
    label: "sales · n=42",
    values: [4, 8, 12, 38, 38] as [number, number, number, number, number],
  },
  {
    label: "product · n=28",
    values: [6, 12, 18, 36, 28] as [number, number, number, number, number],
  },
  {
    label: "eng · n=96",
    values: [8, 14, 20, 34, 24] as [number, number, number, number, number],
  },
  {
    label: "design · n=18",
    values: [12, 22, 24, 26, 16] as [number, number, number, number, number],
  },
  {
    label: "data · n=22",
    values: [10, 18, 22, 30, 20] as [number, number, number, number, number],
  },
  {
    label: "support · n=54",
    values: [22, 28, 18, 20, 12] as [number, number, number, number, number],
  },
  {
    label: "legacy · n=16",
    values: [30, 26, 16, 18, 10] as [number, number, number, number, number],
  },
];

export const glyph = (
  <DivergingStacked
    title="Would recommend"
    rows={ROWS.slice(0, 4).map((row) => ({
      label: row.label.split(" ")[0]!,
      values: row.values,
    }))}
    endLabels={["no", "yes"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Would recommend this job, by team",
    setup:
      "Five-point Likert, anchored on neutral. Agreement grows right. Each row carries its n so a team of 16 cannot shout down a team of 96.",
    read: "Sales is 76% yes. Support and legacy lean left, and legacy's strong-no bar is the largest single slab on the page. Neutral is the spine, not a leftover.",
    source: "Engagement survey, June 2025. eNPS item only.",
    chart: (
      <FigTooltip
        labels={ROWS.map((row) => row.label)}
        series={{
          "strong no": ROWS.map((row) => row.values[0]),
          no: ROWS.map((row) => row.values[1]),
          neutral: ROWS.map((row) => row.values[2]),
          yes: ROWS.map((row) => row.values[3]),
          "strong yes": ROWS.map((row) => row.values[4]),
        }}
        unit="%"
      >
        <DivergingStacked
          density="figure"
          aspect={1.25}
          title="Would recommend this job"
          rows={ROWS}
          endLabels={["disagree", "agree"]}
        />
      </FigTooltip>
    ),
  },
];
