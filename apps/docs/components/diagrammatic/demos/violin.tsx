import { Violin } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
  <Violin
    title="Review scores by category"
    groups={[
      { label: "apps", widths: [1, 4, 9, 13, 10, 5, 2], median: 0.55 },
      { label: "games", widths: [2, 6, 12, 15, 13, 8, 3], median: 0.48 },
      { label: "tools", widths: [1, 3, 7, 11, 14, 9, 3], median: 0.4 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Salaries by department",
    setup:
      "A compensation analyst plots salary distributions per department before the equity review, because averages have been hiding a structural story for years.",
    read: "Sales is pinched in the middle with a bulge at the top: a commission structure, drawn. Support is bottom-heavy with a long thin neck — many people at entry pay, few paths up. Engineering's symmetric bulge is what a leveled ladder looks like.",
    chart: (
      <Report title="Salaries by department" chip="equity review">
        <Violin
          title="Salaries by department"
          groups={[
            { label: "eng", widths: [1, 5, 11, 14, 11, 5, 1], median: 0.5 },
            { label: "sales", widths: [6, 10, 7, 4, 5, 8, 6], median: 0.42 },
            {
              label: "support",
              widths: [8, 13, 10, 5, 2, 1, 0.5],
              median: 0.28,
            },
          ]}
        />
      </Report>
    ),
  },
];
