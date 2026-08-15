import { SymbolMap } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Points of presence, sized by capacity",
    note: "Position says where, area says how much; the two named sites carry the fleet.",
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
    note: "The port warehouse dwarfs the rest; the inland dots are cross-dock stops, not stock.",
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
    note: "One giant coastal weekend and a constellation of village fairs around it.",
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
