import { Line } from "diagrammatic";

const HOURS = Array.from(
  { length: 12 },
  (_, i) => `${String(i * 2).padStart(2, "0")}:00`,
);

export default function SloChart() {
  return (
    <Line
      title="p95 latency, ms"
      labels={HOURS}
      data={[212, 220, 231, 226, 240, 238, 251, 296, 318, 284, 262, 248]}
      yTicks={4}
      guides={[
        { at: 300, label: "SLO" },
        { at: 7, axis: "x", label: "deploy" },
      ]}
    />
  );
}
