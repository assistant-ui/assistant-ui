import { Line } from "diagrammatic";

export default function LatencyByRegionChart() {
  return (
    <Line
      title="p95 latency by region, ms"
      labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
      series={[
        { name: "us-east", data: [182, 176, 191, 204, 188, 160, 152] },
        { name: "eu-west", data: [214, 220, 209, 231, 246, 198, 190] },
        { name: "ap-south", data: [268, 281, 274, 259, 262, 240, 236] },
      ]}
      yTicks={4}
    />
  );
}
