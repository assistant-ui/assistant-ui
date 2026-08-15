import { StackedBar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Monthly cloud cost by service",
    note: "Totals are comparable at the bar tops; compute is the segment that moves them.",
    chart: (
      <StackedBar
        title="Monthly cloud cost by service"
        groups={["Jan", "Feb", "Mar", "Apr"]}
        series={[
          { name: "compute", data: [26, 33, 22, 38] },
          { name: "storage", data: [19, 22, 15, 26] },
          { name: "egress", data: [12, 17, 10, 14] },
        ]}
      />
    ),
  },
  {
    title: "Curbside waste by stream, four districts",
    note: "Similar totals, very different diets: the north district composts what the east landfills.",
    chart: (
      <StackedBar
        title="Waste by stream"
        groups={["north", "east", "south", "west"]}
        series={[
          { name: "recycled", data: [34, 22, 28, 30] },
          { name: "compost", data: [28, 12, 18, 22] },
          { name: "landfill", data: [30, 55, 42, 36] },
        ]}
      />
    ),
  },
  {
    title: "Where four sprints actually went",
    note: "The build segment shrinks sprint over sprint as review and meetings expand into it.",
    chart: (
      <StackedBar
        title="Team hours by activity"
        groups={["s1", "s2", "s3", "s4"]}
        series={[
          { name: "build", data: [220, 200, 175, 150] },
          { name: "review", data: [60, 75, 90, 105] },
          { name: "meetings", data: [50, 60, 72, 85] },
        ]}
      />
    ),
  },
];
