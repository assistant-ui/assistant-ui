import { ArcDiagram } from "diagrammatic";

export function ArcDiagramDemo() {
  return (
    <ArcDiagram
      title="Module imports in file order"
      graph={{
        nodes: ["cli", "core", "ui", "db", "api", "ws", "log", "cfg"].map(
          (id) => ({ id }),
        ),
        links: [
          { source: "cli", target: "ui" },
          { source: "cli", target: "ws" },
          { source: "core", target: "db" },
          { source: "ui", target: "log" },
          { source: "db", target: "api" },
          { source: "api", target: "cfg" },
          { source: "core", target: "log" },
        ],
      }}
      highlight="cli"
    />
  );
}
