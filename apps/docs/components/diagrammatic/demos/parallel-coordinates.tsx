import { ParallelCoordinates } from "diagrammatic";
import type { DemoExample } from "./types";

const AXES = ["pages", "MTTA m", "MTTR h", "SEV-1", "after-hrs %"];
const WEEKS = [
  { name: "W23", values: [18, 6, 2.1, 0, 12] },
  { name: "W24", values: [22, 7, 2.4, 1, 18] },
  { name: "W25", values: [41, 19, 8.6, 3, 44] },
  { name: "W26", values: [36, 14, 6.2, 2, 38] },
  { name: "W27", values: [19, 8, 2.8, 0, 16] },
  { name: "W28", values: [17, 5, 1.9, 0, 11] },
  { name: "W29", values: [24, 9, 3.1, 1, 21] },
  { name: "W30", values: [21, 7, 2.6, 0, 15] },
  { name: "W31", values: [28, 11, 4.4, 1, 27] },
  { name: "W32", values: [16, 5, 1.7, 0, 9] },
];

export const glyph = (
  <ParallelCoordinates
    title="On-call weeks"
    axes={AXES}
    records={WEEKS.slice(0, 4)}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Ten on-call weeks, five axes",
    setup:
      "Each thread is one week. Axes are pages, minutes to ack, hours to resolve, SEV-1 count, and share of pages after hours. Crossings are the bad weeks announcing themselves.",
    read: "W25 and W26 jump together on every axis; that is the checkout outage, not a mood. W32 is the quiet week after the inventory index. MTTA and after-hours move as one line, which is the staffing gap, not the software.",
    source: "On-call weekly rollup, W23 to W32 2025.",
    chart: (
      <ParallelCoordinates
        density="figure"
        aspect={2}
        title="On-call weeks"
        axes={AXES}
        records={WEEKS}
      />
    ),
  },
];
