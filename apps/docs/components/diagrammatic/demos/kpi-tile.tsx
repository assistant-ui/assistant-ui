import { KpiTile } from "diagrammatic";

export function KpiTileDemo() {
  return (
    <KpiTile
      label="active runs"
      value="1,284"
      delta={{ value: "12.4%", direction: "up" }}
      trend={[30, 42, 38, 52, 48, 62, 70, 84]}
    />
  );
}
