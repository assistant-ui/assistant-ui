import { SymbolMap } from "diagrammatic";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Points of presence, sized by capacity",
    setup:
      "An infrastructure page maps the network's points of presence: position says where, circle area says how much. Only the two sites that matter get names.",
    read: "west-1 and east-2 carry the fleet — everything else is an edge location orbiting them. Area is capacity, so the visual hierarchy is the capacity plan; when a new region grows a big circle, the page has news.",
    chart: (
      <Terminal title="points of presence">
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
      </Terminal>
    ),
  },
];
