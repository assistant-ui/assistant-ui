import { StackedBar } from "diagrammatic";

export function StackedBarDemo() {
  return (
    <StackedBar
      title="Monthly cloud cost by service"
      groups={["Jan", "Feb", "Mar", "Apr"]}
      series={[
        { name: "compute", data: [26, 33, 22, 38] },
        { name: "storage", data: [19, 22, 15, 26] },
        { name: "egress", data: [12, 17, 10, 14] },
      ]}
    />
  );
}
