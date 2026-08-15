import { Bump } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Frontend framework popularity rank across five years",
    note: "Positions swap while magnitudes stay hidden; that is the deal a bump chart makes.",
    chart: (
      <Bump
        title="Framework popularity rank"
        series={[
          { name: "react", ranks: [2, 1, 1, 2, 1] },
          { name: "jquery", ranks: [1, 2, 3, 3, 3] },
          { name: "vue", ranks: [3, 3, 2, 1, 2] },
          { name: "angular", ranks: [4, 4, 4, 4, 4] },
        ]}
        labels={["2021", "2022", "2023", "2024", "2025"]}
      />
    ),
  },
  {
    title: "League table across five matchdays",
    note: "United falls from first to fourth in three rounds; the crossings are the season.",
    chart: (
      <Bump
        title="League position"
        series={[
          { name: "united", ranks: [1, 1, 2, 3, 4] },
          { name: "city", ranks: [2, 3, 1, 1, 1] },
          { name: "rovers", ranks: [3, 2, 3, 2, 2] },
          { name: "athletic", ranks: [4, 4, 4, 4, 3] },
        ]}
        labels={["md1", "md2", "md3", "md4", "md5"]}
      />
    ),
  },
  {
    title: "Most popular girls' names across five decades",
    note: "A rank of one in 1990 and 2030 can mean very different counts; ranks flatten that away.",
    chart: (
      <Bump
        title="Baby name rank"
        series={[
          { name: "emma", ranks: [3, 1, 1, 2, 3] },
          { name: "olivia", ranks: [4, 3, 2, 1, 1] },
          { name: "sophia", ranks: [2, 2, 3, 3, 4] },
          { name: "mia", ranks: [1, 4, 4, 4, 2] },
        ]}
        labels={["1990", "2000", "2010", "2020", "2030"]}
      />
    ),
  },
];
