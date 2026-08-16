import { BoxPlot } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Terminal } from "./scenes";

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
    title: "Request latency by region",
    setup:
      "An SRE compares latency across three regions for the capacity review. Each box compresses a week of requests into five numbers: extremes, quartiles, median.",
    read: "EU's whole box sits above NA's median — that is not jitter, that is a structurally slower region, probably a missing edge location. APAC's tight box is the healthiest story on the chart: fast and consistent.",
    chart: (
      <Terminal title="latency by region">
        <BoxPlot
          title="Request latency by region"
          groups={[
            { label: "NA", low: 18, q1: 36, median: 48, q3: 62, high: 82 },
            { label: "EU", low: 30, q1: 48, median: 60, q3: 74, high: 94 },
            { label: "APAC", low: 12, q1: 26, median: 38, q3: 50, high: 66 },
          ]}
        />
      </Terminal>
    ),
  },
  {
    title: "Sale prices by neighborhood",
    setup:
      "A buyer's agent shows a client three neighborhoods as boxes, because the median alone keeps setting the wrong expectations at open houses.",
    read: "The hills' whisker span is wider than the entire riverside box — variance is the story, not the median. In riverside every house costs the same-ish; in the hills the median is almost meaningless and the viewing list needs a budget filter, not an area filter.",
    chart: (
      <AppCard title="Sale prices by neighborhood" meta="12 months">
        <BoxPlot
          title="Sale prices by neighborhood"
          groups={[
            {
              label: "riverside",
              low: 310,
              q1: 355,
              median: 385,
              q3: 420,
              high: 470,
            },
            {
              label: "old town",
              low: 280,
              q1: 340,
              median: 410,
              q3: 500,
              high: 590,
            },
            {
              label: "hills",
              low: 350,
              q1: 470,
              median: 580,
              q3: 720,
              high: 890,
            },
          ]}
        />
      </AppCard>
    ),
  },
  {
    title: "Wheat yield by farming practice",
    setup:
      "An agronomy trial reports three seasons of plot yields by practice. The boxes carry what the headline averages drop: risk.",
    read: "No-till matches conventional's median with a visibly tighter box — same expected output, less variance, which for a farmer is the difference between a bad year and a lost one. Organic yields less and swings more; its case rests on price premium, and this chart says so plainly.",
    chart: (
      <Paper
        kicker="Agronomy"
        title="Yield, risk included"
        source="Source: three-season field trial"
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
              label: "organic",
              low: 2.6,
              q1: 3.4,
              median: 4,
              q3: 4.7,
              high: 5.6,
            },
          ]}
        />
      </Paper>
    ),
  },
];
