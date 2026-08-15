import { Sankey } from "diagrammatic";

export function SankeyDemo() {
  return (
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
}
