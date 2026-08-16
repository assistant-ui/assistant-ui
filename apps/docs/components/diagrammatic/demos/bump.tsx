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
      "A developer survey publishes yearly rankings, and the ecosystem argues about them for the other 364 days. The bump chart plots position, not share: crossings are the content.",
    read: "React and jQuery swap the crown early and never meet again; vue climbs to first for one year before settling. Ranks hide magnitudes — the gap between third and fourth may be a chasm or a rounding error, and this chart deliberately cannot say.",
    chart: (
      <Report title="Framework popularity rank" chip="5 years">
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
      </Report>
    ),
  },
];
