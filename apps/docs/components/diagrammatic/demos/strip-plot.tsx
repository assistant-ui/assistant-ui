import { StripPlot } from "diagrammatic";

export function StripPlotDemo() {
  return (
    <StripPlot
      title="Test durations by suite"
      rows={[
        { label: "unit", values: [0.4, 0.6, 0.7, 0.9, 1, 1.1, 1.4, 1.8, 2.4] },
        { label: "int", values: [1.2, 1.6, 1.9, 2.2, 2.5, 2.8, 3.2, 3.8] },
        { label: "e2e", values: [2.4, 3, 3.4, 3.9, 4.3, 4.8, 5.4, 6] },
      ]}
      labels={["0s", "2s", "4s", "6s"]}
    />
  );
}
