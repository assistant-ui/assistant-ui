import { FlowMap } from "diagrammatic";
import type { DemoExample } from "./types";

const ROUTES = [
  { col: 4, row: 1, value: 84 },
  { col: 14, row: 3, value: 41 },
  { col: 15, row: 3, value: 28 },
  { col: 11, row: 6, value: 19 },
  { col: 5, row: 6, value: 12 },
  { col: 2, row: 2, value: 9 },
  { col: 7, row: 3, value: 7 },
  { col: 8, row: 2, value: 5 },
];

export const glyph = (
  <FlowMap
    title="Egress from hub"
    origin={{ col: 13, row: 2, label: "hub" }}
    routes={ROUTES.slice(0, 4)}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Egress from hub-1",
    setup:
      "One origin, eight destinations. Width is terabytes. More than a handful tangles; eight is the job.",
    read: "The largest route carries 84 TB to tile (4, 1). The next two carry 41 and 28 TB. The remaining five carry 52 TB together.",
    source: "Illustrative origin egress, last 7 days. Width = TB.",
    chart: (
      <FlowMap
        aspect={1.7}
        title="Egress from hub-1"
        origin={{ col: 13, row: 2, label: "hub-1" }}
        routes={ROUTES}
      />
    ),
  },
];
