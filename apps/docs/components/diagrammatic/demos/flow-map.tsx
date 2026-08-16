import { FlowMap } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <FlowMap
    title="Shipments out of one hub"
    origin={{ col: 5, row: 3, label: "hub" }}
    routes={[
      { col: 13, row: 2, value: 26 },
      { col: 14, row: 4, value: 18 },
      { col: 11, row: 6, value: 12 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Shipments out of one hub",
    setup:
      "A distribution planner draws the hub's outbound lanes on the map, stroke width proportional to volume, because lane economics are geographic.",
    read: "The thin southern route is the one under review — a third of the northern lane's volume over similar distance. Width is volume, so the map ranks the lanes before the spreadsheet opens; the review meeting starts from the skinny line.",
    chart: (
      <AppCard title="Lanes out of the hub" meta="weekly tonnage">
        <FlowMap
          title="Shipments out of one hub"
          origin={{ col: 5, row: 3, label: "hub" }}
          routes={[
            { col: 13, row: 2, value: 26 },
            { col: 14, row: 4, value: 18 },
            { col: 11, row: 6, value: 12 },
          ]}
        />
      </AppCard>
    ),
  },
];
