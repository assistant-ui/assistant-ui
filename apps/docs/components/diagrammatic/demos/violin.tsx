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
    read: "Sales is pinched in the middle with bulges at both ends: a commission structure, drawn. Support is bottom-heavy with a long thin neck — many people at entry pay, few paths up. Engineering and product share the same symmetric bulge, which is what leveled ladders look like; the equity review is really about the other two shapes.",
    chart: (
      <Report title="Salaries by department" chip="equity review">
        <Violin
          title="Salaries by department"
          groups={[
            {
              label: "eng",
              widths: [0.5, 2, 5, 9, 13, 14, 13, 9, 5, 2, 0.5],
              median: 0.5,
            },
            {
              label: "sales",
              widths: [3, 6, 9, 7, 5, 4, 5, 7, 9, 7, 3],
              median: 0.42,
            },
            {
              label: "support",
              widths: [6, 10, 13, 11, 8, 5, 3, 2, 1, 0.5, 0.5],
              median: 0.28,
            },
            {
              label: "product",
              widths: [0.5, 1, 3, 6, 10, 12, 10, 7, 4, 2, 1],
              median: 0.52,
            },
          ]}
        />
      </Report>
    ),
  },
];
