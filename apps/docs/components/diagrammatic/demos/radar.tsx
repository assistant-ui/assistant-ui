import { Radar } from "diagrammatic";

export function RadarDemo() {
  return (
    <Radar
      title="Two models across five capabilities"
      axes={["code", "reason", "write", "vision", "speed"]}
      series={[
        { name: "atlas-1", data: [0.85, 0.7, 0.6, 0.8, 0.75] },
        { name: "nova-2", data: [0.55, 0.85, 0.75, 0.45, 0.6] },
      ]}
    />
  );
}
