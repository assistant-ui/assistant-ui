import { Ridgeline } from "diagrammatic";

export function RidgelineDemo() {
  return (
    <Ridgeline
      title="Daily temperatures, month by month"
      rows={["Jan", "Feb", "Mar", "Apr", "May"].map((label, month) => ({
        label,
        bins: Array.from({ length: 10 }, (_, bin) =>
          Math.max(0.5, Math.sin(((bin - month) / 9) * Math.PI) * 40),
        ),
      }))}
      highlight="Mar"
      labels={["-10°", "0°", "10°", "20°"]}
    />
  );
}
