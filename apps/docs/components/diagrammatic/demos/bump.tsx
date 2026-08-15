import { Bump } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Frontend framework popularity rank across five years",
    setup:
      "A developer survey publishes yearly rankings, and the ecosystem argues about them for the other 364 days. The bump chart plots position, not share: crossings are the content.",
    read: "React and jQuery swap the crown early and never meet again; vue climbs to first for one year before settling. Ranks hide magnitudes — the gap between third and fourth may be a chasm or a rounding error, and this chart deliberately cannot say.",
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
    setup:
      "A football podcast recaps the season's opening month with one graphic: table position after each matchday, four clubs, every crossing a headline they already wrote.",
    read: "United falls from first to fourth in three rounds — the crisis arc — while City's line climbs to the top and flattens into control. Athletic never leaves the bottom half; consistency, the bump chart shows, is also a story.",
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
    setup:
      "A registry office celebrates its centenary with the charts everyone actually wants: baby-name leaderboards over time. Four names, five decades, ranks only.",
    read: "Mia holds first in 1990, vanishes to fourth for thirty years, and comes back — names cycle on a generation's delay, and the chart makes the rhythm visible. A rank of one in 1990 and 2030 can mean very different counts; ranks flatten that away by design.",
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
