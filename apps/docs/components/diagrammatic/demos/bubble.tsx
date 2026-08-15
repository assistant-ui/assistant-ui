import { Bubble } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "GDP per capita against life expectancy, sized by population",
    note: "The third variable rides in the area; the two giants dominate without moving the axes.",
    chart: (
      <Bubble
        title="GDP per capita against life expectancy"
        points={[
          { x: 12, y: 71, size: 1400 },
          { x: 18, y: 74, size: 1100 },
          { x: 8, y: 68, size: 340 },
          { x: 42, y: 81, size: 330 },
          { x: 54, y: 83, size: 84 },
          { x: 38, y: 80, size: 67 },
          { x: 62, y: 84, size: 10 },
          { x: 30, y: 78, size: 210 },
          { x: 22, y: 76, size: 128 },
          { x: 48, y: 82, size: 47 },
        ]}
        xLabel="gdp per capita ($k)"
        yLabel="life expectancy"
      />
    ),
  },
  {
    title: "Apps by daily use and retention, sized by revenue",
    note: "The big money bubbles sit high-right, but one small bubble retains better than all of them.",
    chart: (
      <Bubble
        title="Apps by use and retention"
        points={[
          { x: 8, y: 22, size: 40 },
          { x: 14, y: 31, size: 120 },
          { x: 22, y: 38, size: 340 },
          { x: 31, y: 44, size: 520 },
          { x: 26, y: 55, size: 90 },
          { x: 44, y: 48, size: 760 },
          { x: 52, y: 58, size: 980 },
          { x: 12, y: 64, size: 36 },
          { x: 36, y: 35, size: 210 },
        ]}
        xLabel="minutes per day"
        yLabel="30-day retention %"
      />
    ),
  },
  {
    title: "Cities by density and transit share, sized by population",
    note: "Density buys ridership; the sprawling giants sit low-left no matter how big their bubbles.",
    chart: (
      <Bubble
        title="Cities by density and transit"
        points={[
          { x: 2, y: 5, size: 620 },
          { x: 4, y: 12, size: 880 },
          { x: 6, y: 21, size: 390 },
          { x: 8, y: 30, size: 940 },
          { x: 11, y: 38, size: 1400 },
          { x: 15, y: 52, size: 750 },
          { x: 19, y: 61, size: 370 },
          { x: 27, y: 72, size: 320 },
          { x: 9, y: 18, size: 260 },
        ]}
        xLabel="density (k/km²)"
        yLabel="transit share %"
      />
    ),
  },
];
