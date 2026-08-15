import { Area } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Cumulative signups over the year",
    setup:
      "A founder keeps a running total of signups for the monthly investor update. The count only ever goes up, so the question the chart answers is not direction but pace.",
    read: "The fill makes the accumulated volume readable, not just the rate: the area under the curve is the user base itself. The two flat shelves are the months marketing went dark, visible as missing area, not just missing slope.",
    chart: (
      <Area
        title="Cumulative signups"
        data={[2200, 4000, 3400, 5200, 6400, 5800, 7400, 7000, 8800]}
        labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
      />
    ),
  },
  {
    title: "Rainfall through the monsoon, June to September",
    setup:
      "A reservoir engineer tracks monthly rainfall through the wet season, because the town's water year is decided in these four months. What matters is not any single month but the total that falls.",
    read: "The area under the curve is the season's water. July and August did their job; the early finish in September is the worry, and it shows up as the missing wedge on the right, which is exactly what next summer will be short by.",
    chart: (
      <Area
        title="Monthly rainfall"
        data={[85, 210, 340, 310, 265, 180, 95, 40]}
        labels={["Jun", "", "Jul", "", "Aug", "", "Sep", ""]}
        format={(v) => `${v}mm`}
      />
    ),
  },
  {
    title: "Laptop battery across a workday",
    setup:
      "An engineer suspects the new video-call client is the battery villain and logs the charge percentage every hour for one unplugged day.",
    read: "A declining single quantity, which is exactly the area chart's home ground. The steep drains at 11 and 13 line up with the two long meetings; the gentle slopes are heads-down work. The villain has a calendar entry.",
    chart: (
      <Area
        title="Battery level"
        data={[100, 92, 78, 74, 55, 48, 31, 24, 12]}
        labels={["9", "10", "11", "12", "13", "14", "15", "16", "17"]}
        format={(v) => `${v}%`}
      />
    ),
  },
];
