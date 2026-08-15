import { SymbolMap } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Points of presence, sized by capacity",
    setup:
      "An infrastructure page maps the network's points of presence: position says where, circle area says how much. Only the two sites that matter get names.",
    read: "west-1 and east-2 carry the fleet — everything else is an edge location orbiting them. Area is capacity, so the visual hierarchy is the capacity plan; when a new region grows a big circle, the page has news.",
    chart: (
      <SymbolMap
        title="Points of presence"
        marks={[
          { col: 4, row: 1, value: 42, label: "west-1" },
          { col: 7, row: 3, value: 22 },
          { col: 3, row: 4, value: 12 },
          { col: 13, row: 2, value: 16, label: "east-2" },
          { col: 14, row: 3, value: 7 },
          { col: 5, row: 6, value: 6 },
          { col: 11, row: 6, value: 4 },
        ]}
        legendLabel="circle = capacity"
      />
    ),
  },
  {
    title: "Warehouses, sized by pallets on hand",
    setup:
      "A logistics dashboard shows inventory where it physically sits, because the network question — can we serve the east from stock — is spatial before it is numeric.",
    read: "The port warehouse dwarfs the rest; the inland dots are cross-dock stops, not stock. The answer to the east-coast question is the modest circle at central, and the map makes 'no' visible faster than the inventory report says it.",
    chart: (
      <SymbolMap
        title="Warehouse inventory"
        marks={[
          { col: 3, row: 2, value: 48, label: "port" },
          { col: 8, row: 2, value: 14 },
          { col: 12, row: 3, value: 20, label: "central" },
          { col: 6, row: 5, value: 8 },
          { col: 14, row: 5, value: 10 },
          { col: 10, row: 6, value: 5 },
        ]}
        legendLabel="circle = pallets"
      />
    ),
  },
  {
    title: "Summer festivals, sized by attendance",
    setup:
      "A tourism board maps the summer's festivals, circles sized by attendance, deciding where next year's transit shuttles should run.",
    read: "One giant coastal weekend and a constellation of village fairs around it. coastfest's circle is bigger than the next four combined — that is where the shuttles go — while harvest's mid-size dot marks the inland anchor worth growing.",
    chart: (
      <SymbolMap
        title="Festival attendance"
        marks={[
          { col: 5, row: 2, value: 38, label: "coastfest" },
          { col: 9, row: 1, value: 9 },
          { col: 12, row: 2, value: 12 },
          { col: 4, row: 5, value: 7 },
          { col: 8, row: 6, value: 16, label: "harvest" },
          { col: 13, row: 5, value: 6 },
          { col: 15, row: 3, value: 5 },
        ]}
        legendLabel="circle = attendance"
      />
    ),
  },
];
