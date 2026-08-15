import { ConnectedScatter } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Inflation against unemployment, 2018 to 2025",
    note: "Time rides the thread, not an axis; the loop is the whole macro story.",
    chart: (
      <ConnectedScatter
        title="Inflation against unemployment"
        points={[
          { x: 3.9, y: 2.4, label: "2018" },
          { x: 3.7, y: 1.8 },
          { x: 8.1, y: 1.2 },
          { x: 5.4, y: 4.7 },
          { x: 3.6, y: 8 },
          { x: 3.5, y: 4.1 },
          { x: 3.9, y: 3.1 },
          { x: 4.1, y: 2.7, label: "2025" },
        ]}
        xLabel="unemployment %"
        yLabel="inflation %"
      />
    ),
  },
  {
    title: "A startup's burn against revenue, quarter by quarter",
    note: "The path bends right and then down: growth first, then the discipline arrives.",
    chart: (
      <ConnectedScatter
        title="Burn against revenue"
        points={[
          { x: 0.4, y: 3.2, label: "seed" },
          { x: 1.1, y: 4.6 },
          { x: 2.4, y: 6.2 },
          { x: 4.8, y: 7.8 },
          { x: 7.4, y: 7.2 },
          { x: 10.2, y: 5.8 },
          { x: 12.8, y: 4.1 },
          { x: 15.5, y: 2.9, label: "now" },
        ]}
        xLabel="revenue ($m)"
        yLabel="burn ($m/q)"
      />
    ),
  },
  {
    title: "Weekly mileage against race pace, four seasons",
    note: "More miles, faster paces, then the injury year walks the path backwards.",
    chart: (
      <ConnectedScatter
        title="Mileage against pace"
        points={[
          { x: 28, y: 5.5, label: "'22" },
          { x: 38, y: 5.2 },
          { x: 47, y: 4.9 },
          { x: 56, y: 4.7, label: "'24" },
          { x: 31, y: 5.1 },
          { x: 44, y: 4.8, label: "'26" },
        ]}
        xLabel="km per week"
        yLabel="pace (min/km)"
      />
    ),
  },
];
