import { BoxPlot } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Request latency by region",
    note: "Five numbers per box; EU's whole box sits above NA's median.",
    chart: (
      <BoxPlot
        title="Request latency by region"
        groups={[
          { label: "NA", low: 18, q1: 36, median: 48, q3: 62, high: 82 },
          { label: "EU", low: 30, q1: 48, median: 60, q3: 74, high: 94 },
          { label: "APAC", low: 12, q1: 26, median: 38, q3: 50, high: 66 },
        ]}
      />
    ),
  },
  {
    title: "Sale prices by neighborhood",
    note: "The hills' whisker span is wider than the entire riverside box; variance is the story.",
    chart: (
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
    ),
  },
  {
    title: "Wheat yield by farming practice",
    note: "No-till's median matches conventional with a tighter box: same output, less risk.",
    chart: (
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
    ),
  },
];
