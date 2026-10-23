import { Column, formatCompact } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Column
    title="Quarterly revenue"
    items={[
      { label: "Q1", value: 3_800_000 },
      { label: "Q2", value: 5_200_000 },
      { label: "Q3", value: 4_400_000 },
      { label: "Q4", value: 6_600_000 },
      { label: "Q1", value: 5_800_000 },
      { label: "Q2", value: 7_400_000 },
      { label: "Q3", value: 9_000_000 },
    ]}
    highlight="last"
    format={(v) => `$${formatCompact(v)}`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "The benchmark card: one entity, one color, every value printed",
    setup:
      "Seven contenders appear as columns, each with an identity color and its score printed on top. `categorical` colors each item from the token palette, and `values` prints every score.",
    read: "The leading three scores span 3.3 points, from 45.8 to 49.1. The next score is 40.2, a 5.6-point gap below swift. atlas-1 edges nova by 2.8 points, as the printed values show.",
    chart: (
      <FigTooltip
        labels={[
          "glacier",
          "pico",
          "quill",
          "atlas-0",
          "swift",
          "nova",
          "atlas-1",
        ]}
        series={{ score: [24.5, 27.9, 31.6, 40.2, 45.8, 46.3, 49.1] }}
      >
        <Column
          aspect={2.2}
          categorical
          values
          title="FrontierBench 1.1 scores"
          items={[
            { label: "glacier", value: 24.5 },
            { label: "pico", value: 27.9 },
            { label: "quill", value: 31.6 },
            { label: "atlas-0", value: 40.2 },
            { label: "swift", value: 45.8 },
            { label: "nova", value: 46.3 },
            { label: "atlas-1", value: 49.1 },
          ]}
          format={(v) => v.toFixed(1)}
        />
      </FigTooltip>
    ),
    source: "Illustrative FrontierBench 1.1 scores. Higher is better.",
  },
];
