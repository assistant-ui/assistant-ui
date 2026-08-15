import { FlowMap } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Shipments out of one hub",
    note: "Stroke width is volume; the thin southern route is the one under review.",
    chart: (
      <FlowMap
        title="Shipments out of one hub"
        origin={{ col: 5, row: 3, label: "hub" }}
        routes={[
          { col: 13, row: 2, value: 26 },
          { col: 14, row: 4, value: 18 },
          { col: 11, row: 6, value: 12 },
        ]}
      />
    ),
  },
  {
    title: "Relief supplies out of the port",
    note: "Three convoy routes inland; width is tonnage, and the mountain route carries the least.",
    chart: (
      <FlowMap
        title="Relief supplies from the port"
        origin={{ col: 3, row: 2, label: "port" }}
        routes={[
          { col: 9, row: 1, value: 30 },
          { col: 11, row: 4, value: 20 },
          { col: 7, row: 6, value: 9 },
        ]}
      />
    ),
  },
  {
    title: "A band's tour legs from the home city",
    note: "The flows fan out by attendance; the hometown show is the origin, not a line.",
    chart: (
      <FlowMap
        title="Tour legs from home"
        origin={{ col: 8, row: 4, label: "home" }}
        routes={[
          { col: 3, row: 2, value: 22 },
          { col: 13, row: 2, value: 16 },
          { col: 14, row: 6, value: 11 },
          { col: 4, row: 6, value: 8 },
        ]}
      />
    ),
  },
];
