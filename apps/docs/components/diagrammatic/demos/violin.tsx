import { Violin } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Review scores by category",
    setup:
      "An app-store analyst compares rating distributions across three categories. The violin draws the same medians a box plot would, plus the shape a box plot hides.",
    read: "Games bulge mid-scale while tools sag low with a heavy bottom — different dissatisfaction shapes that share similar medians. The shape is the finding; boxes would have flattened all three into near-identical rectangles.",
    chart: (
      <Violin
        title="Review scores by category"
        groups={[
          { label: "apps", widths: [1, 4, 9, 13, 10, 5, 2], median: 0.55 },
          { label: "games", widths: [2, 6, 12, 15, 13, 8, 3], median: 0.48 },
          { label: "tools", widths: [1, 3, 7, 11, 14, 9, 3], median: 0.4 },
        ]}
      />
    ),
  },
  {
    title: "Salaries by department",
    setup:
      "A compensation analyst plots salary distributions per department before the equity review, because averages have been hiding a structural story for years.",
    read: "Sales is pinched in the middle with a bulge at the top: a commission structure, drawn. Support is bottom-heavy with a long thin neck — many people at entry pay, few paths up. Engineering's symmetric bulge is what a leveled ladder looks like.",
    chart: (
      <Violin
        title="Salaries by department"
        groups={[
          { label: "eng", widths: [1, 5, 11, 14, 11, 5, 1], median: 0.5 },
          { label: "sales", widths: [6, 10, 7, 4, 5, 8, 6], median: 0.42 },
          { label: "support", widths: [8, 13, 10, 5, 2, 1, 0.5], median: 0.28 },
        ]}
      />
    ),
  },
  {
    title: "Guest ratings by hotel tier",
    setup:
      "A booking platform compares rating distributions across its three price tiers, asking whether stars bought predictability as well as comfort.",
    read: "Luxury's violin is narrow and high — you know what you're getting. Budget is wide at every level, which is its own kind of honesty: the €40 room is a lottery, and the shape says so better than any average score could.",
    chart: (
      <Violin
        title="Ratings by tier"
        groups={[
          { label: "luxury", widths: [0.5, 1, 2, 4, 8, 14, 10], median: 0.78 },
          { label: "midscale", widths: [1, 3, 7, 12, 12, 7, 2], median: 0.55 },
          { label: "budget", widths: [5, 8, 10, 10, 9, 6, 3], median: 0.44 },
        ]}
      />
    ),
  },
];
