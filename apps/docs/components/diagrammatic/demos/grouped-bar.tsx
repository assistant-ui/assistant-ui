import { GroupedBar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Signups by region and plan",
    setup:
      "A growth team slices the quarter's signups two ways at once — region and plan — because the roadmap argument depends on which cut you look at. Grouped bars keep both reads available.",
    read: "Compare within a group: every region's free bar towers over its paid ones. Compare across groups: APAC leads free and pro but not team — enterprise motion hasn't landed there yet. Same chart, two arguments settled.",
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
    setup:
      "A sports desk builds the medal graphic that runs every two years: three countries, three metals, side by side because gold-vs-gold is the comparison headlines are made of.",
    read: "USA and China trade blows on gold while Britain's bronze bar outruns its gold — a depth-of-field story, not a podium-topping one. The grouped form keeps each metal's race separate; stacking them would bury the only number anyone quotes.",
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
    setup:
      "A homeowner spent $9k on insulation and wants to know if it worked. Utility bills, grouped by season, before-and-after pairs side by side.",
    read: "The pairs shrink most in winter — 570 kWh a season — which is where the insulation money went. Summer barely moves because the retrofit never touched cooling. Payback math now has a chart instead of a feeling.",
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
