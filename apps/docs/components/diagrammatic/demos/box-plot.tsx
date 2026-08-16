import { BoxPlot } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
  <BoxPlot
    title="Request latency by region"
    groups={[
      { label: "NA", low: 18, q1: 36, median: 48, q3: 62, high: 82 },
      { label: "EU", low: 30, q1: 48, median: 60, q3: 74, high: 94 },
      { label: "APAC", low: 12, q1: 26, median: 38, q3: 50, high: 66 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Wheat yield by farming practice",
    setup:
      "An agronomy trial reports three seasons of plot yields by practice. The boxes carry what the headline averages drop: risk.",
    read: "No-till matches conventional's median with a visibly tighter box — same expected output, less variance, which for a farmer is the difference between a bad year and a lost one. The six boxes rank cleanly by median but not by spread: agroforestry's whiskers are the widest on the chart at the lowest median, and organic's case rests on price premium. Risk is the column headline averages drop; here it is the picture.",
    chart: (
      <Paper
        kicker="Agronomy"
        title="Yield, risk included"
        source="Source: three-season field trial"
      >
        <FigTooltip
          labels={[
            "conventional",
            "no-till",
            "cover crop",
            "mixed",
            "organic",
            "agroforestry",
          ]}
          series={{
            high: [6.9, 6.2, 6.1, 6.4, 5.6, 6],
            q3: [5.8, 5.5, 5.4, 5.3, 4.7, 4.9],
            median: [5, 5, 4.8, 4.6, 4, 3.9],
            q1: [4.2, 4.5, 4.3, 3.9, 3.4, 3.1],
            low: [3.1, 3.8, 3.5, 3, 2.6, 2.2],
          }}
          unit="t"
        >
          <BoxPlot
            title="Yield by practice"
            groups={[
              {
                label: "conventional",
                low: 3.1,
                q1: 4.2,
                median: 5,
                q3: 5.8,
                high: 6.9,
              },
              {
                label: "no-till",
                low: 3.8,
                q1: 4.5,
                median: 5,
                q3: 5.5,
                high: 6.2,
              },
              {
                label: "cover crop",
                low: 3.5,
                q1: 4.3,
                median: 4.8,
                q3: 5.4,
                high: 6.1,
              },
              {
                label: "mixed",
                low: 3,
                q1: 3.9,
                median: 4.6,
                q3: 5.3,
                high: 6.4,
              },
              {
                label: "organic",
                low: 2.6,
                q1: 3.4,
                median: 4,
                q3: 4.7,
                high: 5.6,
              },
              {
                label: "agroforestry",
                low: 2.2,
                q1: 3.1,
                median: 3.9,
                q3: 4.9,
                high: 6,
              },
            ]}
          />
        </FigTooltip>
      </Paper>
    ),
  },
];
