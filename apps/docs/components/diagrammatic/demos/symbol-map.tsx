import { SymbolMap } from "diagrammatic";
import type { DemoExample } from "./types";

const MARKS = [
  { col: 4, row: 1, value: 84, label: "west" },
  { col: 7, row: 3, value: 22, label: "inland" },
  { col: 3, row: 4, value: 18 },
  { col: 13, row: 2, value: 61, label: "east" },
  { col: 14, row: 3, value: 27, label: "north" },
  { col: 5, row: 6, value: 9 },
  { col: 11, row: 6, value: 14, label: "south" },
  { col: 2, row: 2, value: 11 },
  { col: 8, row: 2, value: 7 },
  { col: 15, row: 3, value: 16, label: "outer" },
];

export const glyph = (
  <SymbolMap
    title="PoPs"
    marks={MARKS.slice(0, 6)}
    legendLabel="circle size reflects TB egress"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Points of presence, sized by egress",
    setup:
      "Circle size reflects terabytes of egress over seven days. Named sites can be compared against the other plotted locations.",
    read: "West and east are the largest named sites at 84 and 61 TB. North follows at 27 TB, while south has 14 TB. The difference in circle area makes the two leading sites stand out.",
    source: "Illustrative edge egress, last 7 days. Circle size reflects TB.",
    chart: (
      <SymbolMap
        aspect={1.7}
        title="PoPs by egress"
        marks={MARKS}
        legendLabel="circle size reflects TB / 7d"
      />
    ),
  },
];
