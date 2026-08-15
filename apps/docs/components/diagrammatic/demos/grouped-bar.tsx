import { GroupedBar } from "diagrammatic";

export function GroupedBarDemo() {
  return (
    <GroupedBar
      title="Signups by region and plan"
      groups={["NA", "EU", "APAC"]}
      series={[
        { name: "free", data: [46, 62, 78] },
        { name: "pro", data: [34, 48, 55] },
        { name: "team", data: [20, 36, 30] },
      ]}
    />
  );
}
