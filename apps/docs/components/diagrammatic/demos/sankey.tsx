import { Sankey } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Sankey
    title="Energy from sources to uses"
    graph={{
      nodes: [
        { id: "solar", label: "solar 46 TWh" },
        { id: "gas", label: "gas 32 TWh" },
        { id: "homes", label: "homes" },
        { id: "industry", label: "industry" },
        { id: "transport", label: "transport" },
      ],
      links: [
        { source: "solar", target: "homes", value: 28 },
        { source: "solar", target: "industry", value: 18 },
        { source: "gas", target: "industry", value: 12 },
        { source: "gas", target: "transport", value: 20 },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "114 TWh, sources to uses",
    setup:
      "Three columns: source, convert, use. Every ribbon as wide as its flow. The widths have to add up on every column.",
    read: "Solar, wind, and hydro become grid. Gas stays fuel. Homes drink only from the grid. Transport is still entirely bunker. Industry is the only demand that sips both.",
    source:
      "National energy balance, 2024. 114 TWh conserved across three ranks.",
    chart: (
      <FigTooltip
        entries={{
          "solar → grid": 46,
          "wind → grid": 24,
          "hydro → grid": 12,
          "gas → bunker": 32,
          "grid → homes": 40,
          "grid → industry": 31,
          "grid → export": 11,
          "bunker → industry": 12,
          "bunker → transport": 20,
          solar: 46,
          gas: 32,
          wind: 24,
          hydro: 12,
          grid: 82,
          bunker: 32,
          homes: 40,
          industry: 43,
          transport: 20,
          export: 11,
        }}
        unit="TWh"
      >
        <Sankey
          density="figure"
          aspect={2.2}
          title="Energy from sources to uses"
          labels={["source", "convert", "use"]}
          graph={{
            nodes: [
              { id: "solar", label: "solar 46", group: 0 },
              { id: "gas", label: "gas 32", group: 0 },
              { id: "wind", label: "wind 24", group: 0 },
              { id: "hydro", label: "hydro 12", group: 0 },
              { id: "grid", label: "grid 82", group: 1 },
              { id: "bunker", label: "fuel 32", group: 1 },
              { id: "homes", label: "homes 40", group: 2 },
              { id: "industry", label: "industry 43", group: 2 },
              { id: "transport", label: "transport 20", group: 2 },
              { id: "export", label: "export 11", group: 2 },
            ],
            links: [
              { source: "solar", target: "grid", value: 46 },
              { source: "wind", target: "grid", value: 24 },
              { source: "hydro", target: "grid", value: 12 },
              { source: "gas", target: "bunker", value: 32 },
              { source: "grid", target: "homes", value: 40 },
              { source: "grid", target: "industry", value: 31 },
              { source: "grid", target: "export", value: 11 },
              { source: "bunker", target: "industry", value: 12 },
              { source: "bunker", target: "transport", value: 20 },
            ],
          }}
        />
      </FigTooltip>
    ),
  },
];
