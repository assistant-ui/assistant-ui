import { Area } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Cumulative signups over the year",
    note: "The fill makes the accumulated volume readable, not just the rate.",
    chart: (
      <Area
        title="Cumulative signups"
        data={[2200, 4000, 3400, 5200, 6400, 5800, 7400, 7000, 8800]}
        labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
      />
    ),
  },
  {
    title: "Rainfall through the monsoon, June to September",
    note: "The area under the curve is the season's water, which is the number that matters.",
    chart: (
      <Area
        title="Monthly rainfall"
        data={[85, 210, 340, 310, 265, 180, 95, 40]}
        labels={["Jun", "", "Jul", "", "Aug", "", "Sep", ""]}
        format={(v) => `${v}mm`}
      />
    ),
  },
  {
    title: "Laptop battery across a workday",
    note: "A declining single quantity; the meetings show up as the steep drains.",
    chart: (
      <Area
        title="Battery level"
        data={[100, 92, 78, 74, 55, 48, 31, 24, 12]}
        labels={["9", "10", "11", "12", "13", "14", "15", "16", "17"]}
        format={(v) => `${v}%`}
      />
    ),
  },
];
