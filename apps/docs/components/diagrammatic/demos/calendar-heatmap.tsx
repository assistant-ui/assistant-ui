import { CalendarHeatmap } from "diagrammatic";
import type { DemoExample } from "./types";

const CONTRIBUTIONS = Array.from({ length: 112 }, (_, day) =>
  Math.max(
    0,
    Math.round((Math.sin(day * 1.7) + Math.sin(day * 0.6) + 1.2) * 4),
  ),
);

const WORKOUTS = Array.from({ length: 112 }, (_, day) => {
  const weekday = day % 7;
  if (weekday === 2 || weekday === 5) return 0;
  return Math.max(
    0,
    Math.round(Math.sin(day * 0.9) * 2 + (weekday === 6 ? 4 : 2)),
  );
});

const AQI = Array.from({ length: 112 }, (_, day) =>
  Math.max(
    0,
    Math.round(3 + 3 * Math.sin(day * 0.11) + 2.4 * Math.sin(day * 1.3 + 1.5)),
  ),
);

export const examples: DemoExample[] = [
  {
    title: "Contribution activity across 16 weeks",
    note: "The weekday stripes are the job; the gaps are the vacations.",
    chart: (
      <CalendarHeatmap
        title="Contribution activity"
        values={CONTRIBUTIONS}
        weeks={16}
        labels={["May", "Jun", "Jul", "Aug"]}
      />
    ),
  },
  {
    title: "Workouts logged across a training block",
    note: "Rest days are structural, not lapses: the same two columns stay empty every week.",
    chart: (
      <CalendarHeatmap
        title="Workouts logged"
        values={WORKOUTS}
        weeks={16}
        labels={["Jan", "Feb", "Mar", "Apr"]}
      />
    ),
  },
  {
    title: "Air quality index, one summer",
    note: "Two smoke weeks glow dark against an otherwise clean season.",
    chart: (
      <CalendarHeatmap
        title="Daily air quality"
        values={AQI}
        weeks={16}
        labels={["Jun", "Jul", "Aug", "Sep"]}
      />
    ),
  },
];
