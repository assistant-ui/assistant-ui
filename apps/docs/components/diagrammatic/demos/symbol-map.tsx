import { SymbolMap } from "diagrammatic";
import type { DemoExample } from "./types";

const MARKS = [
  { col: 4, row: 1, value: 84, label: "sfo" },
  { col: 7, row: 3, value: 22, label: "den" },
  { col: 3, row: 4, value: 18 },
  { col: 13, row: 2, value: 61, label: "iad" },
  { col: 14, row: 3, value: 27, label: "cdg" },
  { col: 5, row: 6, value: 9 },
  { col: 11, row: 6, value: 14, label: "gru" },
  { col: 2, row: 2, value: 11 },
  { col: 8, row: 2, value: 7 },
  { col: 15, row: 3, value: 16, label: "nrt" },
];

export const glyph = (
  <SymbolMap
    title="PoPs"
    marks={MARKS.slice(0, 6)}
    legendLabel="circle = TB egress"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Points of presence, sized by egress",
    setup:
      "Circle area is terabytes out in seven days. Named sites are the ones a page can take down. The legend is the scale.",
    read: "sfo and iad carry the fleet. cdg is the European hinge. gru is small and far, which is why South America still feels the origin. A new region is news the day its circle grows.",
    source: "Edge egress, last 7 days. Circle area = TB.",
    chart: (
      <SymbolMap
        density="figure"
        aspect={1.7}
        title="PoPs by egress"
        marks={MARKS}
        legendLabel="circle area = TB / 7d"
      />
    ),
  },
];
