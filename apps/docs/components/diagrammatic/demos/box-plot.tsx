import { BoxPlot } from "diagrammatic";

export function BoxPlotDemo() {
  return (
    <BoxPlot
      title="Request latency by region"
      groups={[
        { label: "NA", low: 18, q1: 36, median: 48, q3: 62, high: 82 },
        { label: "EU", low: 30, q1: 48, median: 60, q3: 74, high: 94 },
        { label: "APAC", low: 12, q1: 26, median: 38, q3: 50, high: 66 },
      ]}
    />
  );
}
