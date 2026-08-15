import { DivergingBar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Revenue against plan, by product",
    note: "The zero line is the plan; direction is the verdict before any number is read.",
    chart: (
      <DivergingBar
        title="Revenue against plan"
        items={[
          { label: "cloud", value: 48 },
          { label: "search", value: 34 },
          { label: "mail", value: 26 },
          { label: "iot", value: 18 },
          { label: "maps", value: -12 },
          { label: "ads", value: -22 },
          { label: "video", value: -38 },
        ]}
        format={(v) => `${v}%`}
      />
    ),
  },
  {
    title: "Vote swing by district",
    note: "Seven districts, one baseline: the suburbs moved one way, the city the other.",
    chart: (
      <DivergingBar
        title="Swing since last election"
        items={[
          { label: "harbor", value: 6.4 },
          { label: "northside", value: 4.1 },
          { label: "old town", value: 1.8 },
          { label: "riverbend", value: -0.9 },
          { label: "midtown", value: -2.6 },
          { label: "westgate", value: -5.2 },
          { label: "hills", value: -7.8 },
        ]}
        format={(v) => `${v}pp`}
      />
    ),
  },
  {
    title: "Trade balance by category",
    note: "Exports above the line, imports below; the deficit is visibly a machinery story.",
    chart: (
      <DivergingBar
        title="Trade balance by category"
        items={[
          { label: "services", value: 42 },
          { label: "food", value: 18 },
          { label: "chemicals", value: 9 },
          { label: "textiles", value: -14 },
          { label: "energy", value: -26 },
          { label: "machinery", value: -48 },
        ]}
        format={(v) => `$${Math.abs(v)}B`}
      />
    ),
  },
];
