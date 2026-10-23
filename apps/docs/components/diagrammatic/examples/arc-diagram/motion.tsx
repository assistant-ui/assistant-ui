import { ArcDiagram } from "diagrammatic";

export default function ImportArcs() {
  return (
    <div data-dg-motion="">
      <ArcDiagram
        aspect={2.2}
        title="Which modules import which, in file order"
        graph={{
          nodes: ["cli", "cfg", "core", "db", "api", "net", "ui", "log"].map(
            (id) => ({ id }),
          ),
          links: [
            { source: "cli", target: "cfg" },
            { source: "cli", target: "ui" },
            { source: "core", target: "db" },
            { source: "core", target: "log" },
            { source: "api", target: "db" },
            { source: "api", target: "net" },
            { source: "ui", target: "log" },
            { source: "log", target: "cfg" },
          ],
        }}
      />
    </div>
  );
}
