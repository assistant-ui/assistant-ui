import { Bump } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Frontend framework popularity rank across five years",
    setup:
      "A developer survey publishes yearly rankings, and the ecosystem argues about them for the other 364 days. The bump chart plots position, not share: crossings are the content — eight years, six frameworks, every trade of places drawn.",
    read: "React takes the crown from jQuery in year three and never gives it back; vue touches first for exactly one year; svelte climbs from last to second while jQuery and backbone sink in slow motion. Ranks hide magnitudes — the gap between third and fourth may be a chasm or a rounding error, and this chart deliberately cannot say.",
    chart: (
      <Report title="Framework popularity rank" chip="8 years">
        <Bump
          title="Framework popularity rank"
          series={[
            { name: "react", ranks: [2, 2, 1, 1, 1, 2, 1, 1] },
            { name: "jquery", ranks: [1, 1, 2, 3, 4, 4, 4, 5] },
            { name: "vue", ranks: [5, 3, 3, 2, 2, 1, 3, 3] },
            { name: "angular", ranks: [3, 4, 4, 5, 5, 5, 5, 4] },
            { name: "svelte", ranks: [6, 6, 5, 4, 3, 3, 2, 2] },
            { name: "backbone", ranks: [4, 5, 6, 6, 6, 6, 6, 6] },
          ]}
          labels={[
            "2018",
            "2019",
            "2020",
            "2021",
            "2022",
            "2023",
            "2024",
            "2025",
          ]}
        />
      </Report>
    ),
  },
];
