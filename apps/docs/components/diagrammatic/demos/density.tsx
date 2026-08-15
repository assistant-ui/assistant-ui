import { Density } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Marathon finish times",
    note: "Smooth where a histogram is choppy; the bump before 4:00 is everyone racing the clock.",
    chart: (
      <Density
        title="Marathon finish times"
        bins={[2, 6, 14, 30, 52, 74, 88, 92, 80, 60, 46, 38, 30, 20, 10, 4]}
        marker={{ at: 6.7, label: "median 3:58" }}
        labels={["2:30", "3:30", "4:30", "5:30"]}
      />
    ),
  },
  {
    title: "Door-to-desk commute times",
    note: "Two humps, one city: the transit crowd and the drivers never meet in the middle.",
    chart: (
      <Density
        title="Commute times"
        bins={[4, 18, 42, 58, 46, 24, 14, 12, 22, 40, 52, 44, 26, 12, 5, 2]}
        marker={{ at: 7.2, label: "median 41 min" }}
        labels={["10", "30", "50", "70", "90 min"]}
      />
    ),
  },
  {
    title: "Daily screen time across a user base",
    note: "The curve is the honest average: most people near four hours, a tail that never logs off.",
    chart: (
      <Density
        title="Daily screen time"
        bins={[6, 16, 34, 58, 78, 88, 82, 66, 48, 34, 24, 16, 11, 8, 5, 3]}
        marker={{ at: 5.1, label: "median 4.1h" }}
        labels={["0h", "3h", "6h", "9h"]}
      />
    ),
  },
];
