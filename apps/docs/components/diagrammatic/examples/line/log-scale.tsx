import { Line, formatCompact } from "diagrammatic";

export default function StarsChart() {
  return (
    <Line
      title="Cumulative GitHub stars"
      labels={[
        "M1",
        "M2",
        "M3",
        "M4",
        "M5",
        "M6",
        "M7",
        "M8",
        "M9",
        "M10",
        "M11",
        "M12",
      ]}
      data={[
        180, 420, 760, 1500, 2600, 4100, 6900, 9800, 14200, 21500, 30100, 41800,
      ]}
      yScale="log"
      yTicks={3}
      format={formatCompact}
    />
  );
}
