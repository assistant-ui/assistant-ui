import { Heatmap } from "diagrammatic";

export function HeatmapDemo() {
  return (
    <Heatmap
      title="Deploys by service and hour"
      matrix={{
        rows: ["api", "web", "db", "jobs", "cdn"],
        cols: ["8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"],
        values: [
          [0.2, 0.4, 0.7, 0.5, 0.3, 0.2, 0.1, 0.15],
          [0.3, 0.6, 0.9, 0.7, 0.5, 0.3, 0.2, 0.1],
          [0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.3, 0.2],
          [0.1, 0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.3],
          [0.05, 0.2, 0.3, 0.4, 0.6, 0.8, 0.5, 0.4],
        ],
      }}
    />
  );
}
