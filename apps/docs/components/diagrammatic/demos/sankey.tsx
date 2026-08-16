import { Sankey } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Slide } from "./scenes";

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
    title: "Energy from sources to uses",
    setup:
      "An energy agency reports where the country's 114 TWh actually went: four sources on the left, four demands on the right, every link as wide as its flow. Sankeys are conservation laws you can look at.",
    read: "Solar carries the homes almost single-handedly while industry drinks from three sources at once — the diversification the plan called for. Wind's biggest ribbon leaves the country as export, hydro splits itself evenly, and the widths close the argument: transport still runs entirely on gas.",
    chart: (
      <Slide title="Where 114 TWh went" footer="energy agency">
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
            title="Energy from sources to uses"
            graph={{
              nodes: [
                { id: "solar", label: "solar 46 TWh" },
                { id: "gas", label: "gas 32 TWh" },
                { id: "wind", label: "wind 24 TWh" },
                { id: "hydro", label: "hydro 12 TWh" },
                { id: "homes", label: "homes" },
                { id: "industry", label: "industry" },
                { id: "transport", label: "transport" },
                { id: "export", label: "export" },
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
      </Slide>
    ),
  },
];
