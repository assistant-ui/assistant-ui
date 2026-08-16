import { StackedBar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { AppCard, Terminal } from "./scenes";

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
    title: "The usage calendar: seven weeks, one bar per day",
    setup:
      "The public data page every AI tool ships now: daily token volume stacked by model, seven weeks wide, one thin bar per day. The chart stays a server component; wrapping it in the interactive layer's Root adds a pointer-following tooltip that reads the hovered day straight off the mark seams.",
    read: "The stack order keeps each model's band readable at two pixels wide, and hovering any day opens the full ledger: every model's tokens plus the total, the hovered band emphasized. pico's bottom band doubles across the last three weeks while atlas-0 thins in mirror — a migration, drawn daily and quotable on hover.",
    chart: (
      <Terminal title="daily tokens by model — B/day">
        <FigTooltip labels={DAYS} series={USAGE} unit="B" total>
          <StackedBar
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
      </Terminal>
    ),
  },
  {
    title: "The normalized variant: device mix by year",
    setup:
      "Passing `normalize` stretches every bar to 100%, so only composition remains. Five years of a storefront's traffic by device, for the meeting where someone asks whether the mobile redesign can wait another year.",
    read: "Mobile eats four points of share a year, every year, and tablet quietly halves. Absolute traffic grew the whole time, which the normalized form deliberately hides; that is the trade, and here it is the right one.",
    chart: (
      <AppCard title="Device mix" meta="share of traffic">
        <StackedBar
          normalize
          title="Device mix by year"
          groups={["'21", "'22", "'23", "'24", "'25"]}
          series={[
            { name: "mobile", data: [44, 50, 56, 61, 66] },
            { name: "desktop", data: [42, 38, 34, 31, 28] },
            { name: "tablet", data: [14, 12, 10, 8, 6] },
          ]}
        />
      </AppCard>
    ),
  },
];
