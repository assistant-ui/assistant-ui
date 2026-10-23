import { WorldMap } from "diagrammatic/world";

export default function RevenueMap() {
  return (
    <WorldMap
      title="Revenue by country, $k"
      values={{
        US: 920,
        GB: 310,
        DE: 280,
        FR: 190,
        JP: 240,
        IN: 120,
        BR: 90,
        AU: 110,
        CA: 170,
      }}
    />
  );
}
