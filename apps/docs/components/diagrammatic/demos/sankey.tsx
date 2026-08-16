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
      "Four sources, four demands, every ribbon as wide as its flow. The widths have to add up.",
    read: "Solar carries the homes almost alone. Industry drinks from three sources. Wind's widest ribbon leaves as export. Transport is still entirely gas.",
    source: "National energy balance, 2024. 114 TWh conserved.",
    chart: (
      <FigTooltip
        entries={{
          "solar → homes": 28,
          "solar → industry": 18,
          "gas → industry": 12,
          "gas → transport": 20,
          "wind → homes": 6,
          "wind → industry": 7,
          "wind → export": 11,
          "hydro → homes": 6,
          "hydro → industry": 6,
          solar: 46,
          gas: 32,
          wind: 24,
          hydro: 12,
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
          graph={{
            nodes: [
              { id: "solar", label: "solar 46 TWh" },
              { id: "gas", label: "gas 32 TWh" },
              { id: "wind", label: "wind 24 TWh" },
              { id: "hydro", label: "hydro 12 TWh" },
              { id: "homes", label: "homes 40" },
              { id: "industry", label: "industry 43" },
              { id: "transport", label: "transport 20" },
              { id: "export", label: "export 11" },
            ],
            links: [
              { source: "solar", target: "homes", value: 28 },
              { source: "solar", target: "industry", value: 18 },
              { source: "gas", target: "industry", value: 12 },
              { source: "gas", target: "transport", value: 20 },
              { source: "wind", target: "homes", value: 6 },
              { source: "wind", target: "industry", value: 7 },
              { source: "wind", target: "export", value: 11 },
              { source: "hydro", target: "homes", value: 6 },
              { source: "hydro", target: "industry", value: 6 },
            ],
          }}
        />
      </FigTooltip>
    ),
  },
];
