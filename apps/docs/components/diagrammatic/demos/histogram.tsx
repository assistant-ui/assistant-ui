import { Histogram } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "API response times, one day of requests",
    note: "The long right tail is the pager's territory; the median line keeps it honest.",
    chart: (
      <Histogram
        title="API response times"
        bins={[6, 12, 22, 38, 58, 78, 92, 84, 66, 46, 30, 18, 10, 5]}
        marker={{ at: 6.9, label: "median 392ms" }}
        labels={["0", "200ms", "400ms", "600ms", "800ms"]}
      />
    ),
  },
  {
    title: "Final exam scores, one cohort",
    note: "A shoulder below the pass mark: two populations wearing one average.",
    chart: (
      <Histogram
        title="Exam scores"
        bins={[2, 5, 9, 16, 12, 8, 14, 26, 38, 44, 36, 22, 10, 4]}
        marker={{ at: 5.5, label: "pass 55" }}
        labels={["0", "25", "50", "75", "100"]}
      />
    ),
  },
  {
    title: "Homes sold this year, by price",
    note: "Skewed right, as prices always are; the mean would land above most sales.",
    chart: (
      <Histogram
        title="Sale prices"
        bins={[8, 24, 52, 74, 68, 50, 34, 22, 14, 9, 6, 4, 2, 1]}
        marker={{ at: 3.4, label: "median $412k" }}
        labels={["$200k", "$400k", "$600k", "$800k", "$1m"]}
      />
    ),
  },
];
