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
    title="Egress from iad"
    origin={{ col: 13, row: 2, label: "iad" }}
    routes={ROUTES.slice(0, 4)}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Egress from iad-1",
    setup:
      "One origin, eight destinations. Width is terabytes. More than a handful tangles; eight is the job.",
    read: "The westbound stroke to sfo is the fat one. Paris and Tokyo split the rest of the planet. The thin interior routes are why we still pay origin CPU in Denver.",
    source: "Origin iad-1 egress, last 7 days. Width = TB.",
    chart: (
      <FlowMap
        density="figure"
        aspect={1.7}
        title="Egress from iad-1"
        origin={{ col: 13, row: 2, label: "iad-1" }}
        routes={ROUTES}
      />
    ),
  },
];
