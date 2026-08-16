import { Heatmap } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Terminal } from "./scenes";

const CALENDAR = Array.from({ length: 7 }, (_, r) =>
  Array.from({ length: 16 }, (_, c) => {
    const day = c * 7 + r;
    if (r >= 5) return Math.max(0, Math.round(Math.sin(day * 0.9) * 2));
    return Math.max(
      0,
      Math.round((Math.sin(day * 1.7) + Math.sin(day * 0.6) + 1.2) * 4),
    );
  }),
);

export const glyph = (
  <Heatmap
    title="Deploys by service and hour"
    matrix={{
      rows: ["api", "web", "db", "jobs", "cdn"],
      cols: ["8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"],
      values: [
        [0.2, 0.4, 0.7, 0.5, 0.3, 0.2, 0.1, 0.15],
        [0.3, 0.6, 0.9, 0.7, 0.5, 0.3, 0.2, 0.1],
        [0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.3, 0.2],
        [0.1, 0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.3],
        [0.05, 0.2, 0.3, 0.4, 0.6, 0.8, 0.5, 0.4],
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Deploys by service and hour",
    setup:
      "A platform team suspects the release train bunches up, so they pull a week of deploy events and bucket them by service and by hour of day. Two categorical axes, one intensity: the classic heatmap job.",
    read: "The noon column burns across every service: release o'clock is real. The db row peaks latest and the cdn earliest, which is the deploy pipeline's ordering showing up as color.",
    chart: (
      <Terminal title="deploys — svc × hour">
        <Heatmap
          title="Deploys by service and hour"
          matrix={{
            rows: ["api", "web", "db", "jobs", "cdn"],
            cols: ["8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"],
            values: [
              [0.2, 0.4, 0.7, 0.5, 0.3, 0.2, 0.1, 0.15],
              [0.3, 0.6, 0.9, 0.7, 0.5, 0.3, 0.2, 0.1],
              [0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.3, 0.2],
              [0.1, 0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.3],
              [0.05, 0.2, 0.3, 0.4, 0.6, 0.8, 0.5, 0.4],
            ],
          }}
        />
      </Terminal>
    ),
  },
  {
    title: "The punchcard: commits by weekday and hour",
    setup:
      'The same matrix drawn with `mark="dot"` sizes a circle per cell instead of shading it: the classic punchcard that code-hosting profiles made famous. Here, a repo\'s commits bucketed by weekday and two-hour block.',
    read: "Midweek afternoons carry the repo; the dots thin toward the weekend but never disappear. Size reads better than color when the values sit close together, which is why the punchcard survives as a form.",
    chart: (
      <Terminal title="commits — punchcard">
        <Heatmap
          mark="dot"
          title="Commits by weekday and hour"
          matrix={{
            rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            cols: ["0h", "", "", "6h", "", "", "12h", "", "", "18h", "", ""],
            values: [0.45, 0.85, 1, 0.9, 0.75, 0.5, 0.3].map((day, r) =>
              Array.from({ length: 12 }, (_, c) =>
                Math.max(
                  0,
                  day * Math.sin(((c + 0.5) / 12) * Math.PI) +
                    0.12 * Math.sin(c * 2.1 + r),
                ),
              ),
            ),
          }}
        />
      </Terminal>
    ),
  },
  {
    title: "The calendar: sixteen weeks of contributions",
    setup:
      "Feed the matrix seven weekday rows and one column per week and the heatmap becomes a contribution calendar. Sixteen weeks of a maintainer's activity, weekends on the bottom rows.",
    read: "The weekday stripes are the job; the two pale columns are vacations, visible without a single date label. The bottom two rows run cooler than the rest, which is what a healthy relationship with open source looks like.",
    chart: (
      <AppCard title="Contribution activity" meta="16 weeks">
        <Heatmap
          title="Contribution activity"
          aspect={2.2}
          matrix={{
            rows: ["Mon", "", "Wed", "", "Fri", "", "Sun"],
            cols: Array.from({ length: 16 }, (_, i) =>
              i === 0
                ? "May"
                : i === 5
                  ? "Jun"
                  : i === 9
                    ? "Jul"
                    : i === 14
                      ? "Aug"
                      : "",
            ),
            values: CALENDAR,
          }}
        />
      </AppCard>
    ),
  },
];
