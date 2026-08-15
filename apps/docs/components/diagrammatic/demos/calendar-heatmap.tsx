import { CalendarHeatmap } from "diagrammatic";

const CONTRIBUTIONS = Array.from({ length: 112 }, (_, day) =>
  Math.max(
    0,
    Math.round((Math.sin(day * 1.7) + Math.sin(day * 0.6) + 1.2) * 4),
  ),
);

export function CalendarHeatmapDemo() {
  return (
    <CalendarHeatmap
      title="Contribution activity"
      values={CONTRIBUTIONS}
      weeks={16}
      labels={["May", "Jun", "Jul", "Aug"]}
    />
  );
}
