import { Sankey } from "diagrammatic";
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
      "An energy agency reports where the country's 78 TWh actually went: generation on the left, demand on the right, every link as wide as its flow. Sankeys are conservation laws you can look at.",
    read: "Solar carries the homes almost single-handedly while industry drinks from both sources — the diversification the plan called for. Every link conserves its TWh, and the widths are the argument: transport still runs entirely on gas.",
    chart: (
      <Slide title="Where 78 TWh went" footer="energy agency">
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
      </Slide>
    ),
  },
];
