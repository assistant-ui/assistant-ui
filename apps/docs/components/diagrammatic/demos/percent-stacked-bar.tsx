import { PercentStackedBar } from "diagrammatic";

export function PercentStackedBarDemo() {
  return (
    <PercentStackedBar
      title="Device mix by year"
      groups={["'21", "'22", "'23", "'24", "'25"]}
      series={[
        { name: "mobile", data: [44, 50, 56, 61, 66] },
        { name: "desktop", data: [42, 38, 34, 31, 28] },
        { name: "tablet", data: [14, 12, 10, 8, 6] },
      ]}
    />
  );
}
