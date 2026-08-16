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
    read: "Sales is pinched in the middle with bulges at both ends: a commission structure, drawn — and the raw dots inside each shape are the actual salaries, so the two sales clusters are countable people, not a smoothing artifact. Support is bottom-heavy with a long thin neck; engineering and product share the same symmetric bulge, which is what leveled ladders look like. Identity color per department, every point kept: the equity review argues from this figure, not from averages.",
    chart: (
      <Report title="Salaries by department" chip="equity review">
        <Violin
          title="Salaries by department"
          categorical
          groups={[
            {
              label: "eng",
              widths: [0.5, 2, 5, 9, 13, 14, 13, 9, 5, 2, 0.5],
              median: 0.5,
              points: [
                68, 74, 79, 84, 88, 92, 95, 99, 102, 105, 108, 111, 114, 117,
                120, 124, 128, 133, 138, 144, 151, 159,
              ],
            },
            {
              label: "sales",
              widths: [3, 6, 9, 7, 5, 4, 5, 7, 9, 7, 3],
              median: 0.42,
              points: [
                45, 48, 52, 55, 58, 61, 64, 67, 71, 76, 88, 96, 104, 112, 118,
                124, 129, 134, 139, 143, 147, 150,
              ],
            },
            {
              label: "support",
              widths: [6, 10, 13, 11, 8, 5, 3, 2, 1, 0.5, 0.5],
              median: 0.28,
              points: [
                38, 40, 42, 44, 45, 47, 48, 50, 52, 53, 55, 57, 59, 62, 65, 69,
                74, 80, 88, 97, 108, 121,
              ],
            },
            {
              label: "product",
              widths: [0.5, 1, 3, 6, 10, 12, 10, 7, 4, 2, 1],
              median: 0.52,
              points: [
                75, 82, 88, 93, 98, 103, 107, 111, 115, 119, 123, 127, 131, 135,
                139, 144, 148, 152, 156, 160, 164, 168,
              ],
            },
          ]}
        />
      </Report>
    ),
  },
];
