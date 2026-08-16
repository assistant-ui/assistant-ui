import { StackedBar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <StackedBar
    title="Monthly cloud cost by service"
    groups={["Jan", "Feb", "Mar", "Apr"]}
    series={[
      { name: "compute", data: [26, 33, 22, 38] },
      { name: "storage", data: [19, 22, 15, 26] },
      { name: "egress", data: [12, 17, 10, 14] },
    ]}
  />
);

const DAYS = [
  ...Array.from({ length: 31 }, (_, i) => `Jul ${i + 1}`),
  ...Array.from({ length: 18 }, (_, i) => `Aug ${i + 1}`),
];

const USAGE: Record<string, number[]> = {
  pico: [
    9, 9, 9, 10, 10, 7, 7, 10, 11, 11, 11, 11, 8, 8, 12, 12, 12, 13, 13, 9, 9,
    13, 14, 14, 14, 14, 10, 10, 15, 15, 16, 16, 17, 12, 13, 21, 22, 23, 25, 27,
    19, 20, 32, 34, 36, 38, 40, 29, 31,
  ],
  quill: [
    7, 7, 7, 7, 8, 5, 5, 7, 7, 7, 7, 8, 5, 5, 8, 9, 8, 8, 8, 5, 5, 8, 8, 8, 8,
    8, 6, 6, 8, 8, 8, 8, 8, 6, 6, 9, 9, 10, 9, 9, 6, 6, 9, 9, 9, 9, 9, 6, 7,
  ],
  "atlas-0": [
    11, 11, 11, 11, 11, 7, 7, 10, 10, 10, 10, 10, 7, 6, 9, 9, 9, 9, 9, 6, 6, 9,
    8, 8, 8, 8, 5, 5, 8, 8, 8, 7, 7, 5, 5, 7, 7, 7, 7, 7, 4, 4, 6, 6, 6, 6, 6,
    4, 4,
  ],
  nova: [
    5, 5, 6, 5, 5, 4, 4, 5, 5, 5, 5, 7, 4, 4, 6, 6, 6, 6, 6, 4, 5, 6, 6, 6, 6,
    6, 4, 4, 6, 7, 6, 6, 6, 4, 4, 6, 6, 6, 8, 6, 4, 4, 7, 7, 7, 7, 7, 5, 5,
  ],
  swift: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
    1, 1, 1, 2, 2, 2, 3, 3, 2, 2, 4, 4, 4, 4, 5, 3, 4, 5, 6, 6, 6, 6, 5, 5,
  ],
  glacier: [
    2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 2, 2,
  ],
};

export const examples: DemoExample[] = [
  {
    title: "Daily tokens by model, seven weeks",
    setup:
      "The public usage page: daily token volume stacked by model, forty-nine thin bars. Totals first, mix second. Hover any day for the ledger.",
    read: "pico's bottom band doubles in the last three weeks while atlas-0 thins in mirror. That is a migration, not a traffic spike. swift appears from nothing in late July and is already a visible slice by mid-August.",
    source: "Billed tokens per day, 1 Jul to 18 Aug.",
    chart: (
      <FigTooltip labels={DAYS} series={USAGE} unit="B" total>
        <StackedBar
          density="figure"
          aspect={2.2}
          title="Daily token volume by model"
          groups={DAYS.map((day, i) => (i % 7 === 0 ? day : ""))}
          series={Object.entries(USAGE).map(([name, data]) => ({
            name,
            data,
          }))}
          yTicks={[
            { at: 0, label: "0" },
            { at: 40, label: "40" },
            { at: 80, label: "80" },
          ]}
        />
      </FigTooltip>
    ),
  },
];
