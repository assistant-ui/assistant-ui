import { Punchcard } from "diagrammatic";
import type { DemoExample } from "./types";

const COMMIT_WEIGHT = [0.45, 0.85, 1, 0.9, 0.75, 0.5, 0.3];

const HOURS = ["0h", "", "", "6h", "", "", "12h", "", "", "18h", "", ""];

export const examples: DemoExample[] = [
  {
    title: "Commits by weekday and hour",
    note: "Midweek afternoons carry the repo; weekends thin out but never go dark.",
    chart: (
      <Punchcard
        title="Commits by weekday and hour"
        matrix={{
          rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          cols: HOURS,
          values: COMMIT_WEIGHT.map((day, r) =>
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
    ),
  },
  {
    title: "Restaurant orders by day and hour",
    note: "Two dots per day: lunch and dinner, with Friday dinner the biggest of the week.",
    chart: (
      <Punchcard
        title="Orders by day and hour"
        matrix={{
          rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          cols: HOURS,
          values: [0.5, 0.55, 0.6, 0.7, 1, 0.95, 0.65].map((day, r) =>
            Array.from({ length: 12 }, (_, c) => {
              const hour = c * 2;
              const lunch = Math.exp(-((hour - 12) ** 2) / 4);
              const dinner = Math.exp(-((hour - 19) ** 2) / 5);
              return day * (lunch * 0.7 + dinner) + 0.03 * ((r + c) % 3);
            }),
          ),
        }}
      />
    ),
  },
  {
    title: "Support chats by day and hour",
    note: "A business-hours block, softened on Friday and gone on the weekend.",
    chart: (
      <Punchcard
        title="Support chats by day and hour"
        matrix={{
          rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          cols: HOURS,
          values: [1, 0.95, 0.9, 0.92, 0.7, 0.15, 0.1].map((day, r) =>
            Array.from({ length: 12 }, (_, c) => {
              const hour = c * 2;
              const office = hour >= 8 && hour <= 18 ? 1 : 0.08;
              return day * office * (0.7 + 0.3 * Math.sin(c * 1.1 + r));
            }),
          ),
        }}
      />
    ),
  },
];
