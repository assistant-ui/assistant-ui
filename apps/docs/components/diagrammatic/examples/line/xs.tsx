import { Line } from "diagrammatic";

export default function EvalLossChart() {
  return (
    <Line
      title="Validation loss against training tokens, billions"
      xs={[1, 2, 4, 8, 16, 32, 64, 128]}
      xScale="log"
      xTicks={[
        { at: 1, label: "1B" },
        { at: 8, label: "8B" },
        { at: 64, label: "64B" },
      ]}
      series={[
        { name: "350M", data: [3.9, 3.6, 3.35, 3.16, 3.02, 2.93, 2.88, 2.86] },
        { name: "1.3B", data: [3.8, 3.42, 3.11, 2.86, 2.68, 2.55, 2.47, 2.42] },
      ]}
      yTicks={3}
      format={(v) => v.toFixed(1)}
    />
  );
}
