import { Violin } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Review scores by category",
    note: "Same medians a box plot would show, plus the shape a box plot would hide.",
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
    note: "Sales is pinched with a bulge at the top: a commission structure, drawn.",
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
    note: "Luxury's violin is narrow and high; budget is wide everywhere, which is its own kind of honesty.",
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
