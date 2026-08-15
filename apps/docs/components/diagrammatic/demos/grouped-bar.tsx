import { GroupedBar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Signups by region and plan",
    note: "Compare plans inside a region, or one plan across regions; both reads work.",
    chart: (
      <GroupedBar
        title="Signups by region and plan"
        groups={["NA", "EU", "APAC"]}
        series={[
          { name: "free", data: [46, 62, 78] },
          { name: "pro", data: [34, 48, 55] },
          { name: "team", data: [20, 36, 30] },
        ]}
      />
    ),
  },
  {
    title: "Medal table, three games",
    note: "Gold, silver, and bronze side by side; the gold bar is the one headlines count.",
    chart: (
      <GroupedBar
        title="Medals by country"
        groups={["USA", "CHN", "GBR"]}
        series={[
          { name: "gold", data: [40, 38, 14] },
          { name: "silver", data: [44, 32, 22] },
          { name: "bronze", data: [42, 19, 29] },
        ]}
      />
    ),
  },
  {
    title: "Household energy by season, before and after the retrofit",
    note: "The pairs shrink most in winter, which is where the insulation money went.",
    chart: (
      <GroupedBar
        title="Energy use by season"
        groups={["winter", "spring", "summer", "fall"]}
        series={[
          { name: "before", data: [1450, 820, 960, 900] },
          { name: "after", data: [880, 640, 850, 700] },
        ]}
      />
    ),
  },
];
