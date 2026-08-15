import { PercentStackedBar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Device mix by year",
    note: "Every bar is 100%; only the composition moves, and mobile eats it steadily.",
    chart: (
      <PercentStackedBar
        title="Device mix by year"
        groups={["'21", "'22", "'23", "'24", "'25"]}
        series={[
          { name: "mobile", data: [44, 50, 56, 61, 66] },
          { name: "desktop", data: [42, 38, 34, 31, 28] },
          { name: "tablet", data: [14, 12, 10, 8, 6] },
        ]}
      />
    ),
  },
  {
    title: "Electricity mix, four countries",
    note: "Absolute generation differs wildly; forcing 100% makes the mixes comparable anyway.",
    chart: (
      <PercentStackedBar
        title="Electricity mix"
        groups={["NOR", "FRA", "DEU", "POL"]}
        series={[
          { name: "renewables", data: [98, 26, 52, 27] },
          { name: "nuclear", data: [0, 65, 6, 0] },
          { name: "fossil", data: [2, 9, 42, 73] },
        ]}
      />
    ),
  },
  {
    title: "How each campus gets to work",
    note: "The downtown office barely drives; the suburban one barely does anything else.",
    chart: (
      <PercentStackedBar
        title="Commute mode by campus"
        groups={["downtown", "midtown", "suburban"]}
        series={[
          { name: "transit", data: [54, 32, 8] },
          { name: "car", data: [18, 44, 78] },
          { name: "bike/walk", data: [28, 24, 14] },
        ]}
      />
    ),
  },
];
