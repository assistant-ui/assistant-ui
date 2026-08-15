import { Histogram } from "diagrammatic";

export function HistogramDemo() {
  return (
    <Histogram
      title="API response times"
      bins={[6, 12, 22, 38, 58, 78, 92, 84, 66, 46, 30, 18, 10, 5]}
      marker={{ at: 6.9, label: "median 392ms" }}
      labels={["0", "200ms", "400ms", "600ms", "800ms"]}
    />
  );
}
