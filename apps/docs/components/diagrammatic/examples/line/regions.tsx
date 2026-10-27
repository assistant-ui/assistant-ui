import { Line } from "diagrammatic";

const HOURS = Array.from(
  { length: 13 },
  (_, i) => `${String(i * 2).padStart(2, "0")}:00`,
);

export default function ErrorRateChart() {
  return (
    <Line
      title="Checkout error rate, %"
      labels={HOURS.map((h, i) => (i % 2 === 0 ? h : ""))}
      data={[0.4, 0.5, 0.4, 0.6, 2.8, 3.4, 1.1, 0.7, 0.5, 0.4, 0.5, 0.4, 0.4]}
      regions={[{ from: 3.5, to: 6, label: "incident" }]}
      marks={[
        { at: 4, label: "deploy 4812" },
        { at: 6, label: "rollback" },
      ]}
      yTicks={3}
    />
  );
}
