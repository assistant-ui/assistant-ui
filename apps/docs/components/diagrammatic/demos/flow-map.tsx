import { FlowMap } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Shipments out of one hub",
    setup:
      "A distribution planner draws the hub's outbound lanes on the map, stroke width proportional to volume, because lane economics are geographic.",
    read: "The thin southern route is the one under review — a third of the northern lane's volume over similar distance. Width is volume, so the map ranks the lanes before the spreadsheet opens; the review meeting starts from the skinny line.",
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
    setup:
      "A humanitarian logistics cell maps three convoy routes inland from the port, width equal to tonnage moved this week — the map the coordination meeting stands around.",
    read: "The mountain route carries the least and costs the most, and the flow map states it in one thin stroke. When the southern road reopens, this map is how everyone will see the tonnage shift before the reports say so.",
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
    setup:
      "A tour manager wraps the year with a fan-out map: every leg from the home city, stroke width scaled to tickets sold.",
    read: "The flows fan out by attendance, and the hometown is the origin, not a line — the biggest show never travels. The thin southwestern leg was the experiment; its width says whether the experiment repeats.",
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
