import { ArcDiagram } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
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

export const examples: DemoExample[] = [
  {
    title: "Module imports in file order",
    setup:
      "Nodes follow a fixed file order. Each arc shows how many positions an import jumps.",
    read: "test reaching back to cli is the longest jump, spanning eleven positions. cli to ui spans eight, followed by cli to ws and core to log at seven each. core to db to api forms two shorter hops.",
    source: "Module imports in file order.",
    chart: (
      <FigTooltip
        entries={{
          cli: "3 imports",
          core: "2 imports",
          auth: "1 import",
          db: "1 import",
          api: "2 imports",
          net: "1 import",
          ui: "2 imports",
          test: "2 imports",
        }}
      >
        <ArcDiagram
          aspect={2.2}
          title="Module imports in file order"
          graph={{
            nodes: [
              "cli",
              "cfg",
              "core",
              "auth",
              "db",
              "api",
              "net",
              "ws",
              "ui",
              "log",
              "fs",
              "test",
            ].map((id) => ({ id })),
            links: [
              { source: "cli", target: "cfg" },
              { source: "cli", target: "ui" },
              { source: "cli", target: "ws" },
              { source: "core", target: "db" },
              { source: "core", target: "log" },
              { source: "auth", target: "db" },
              { source: "db", target: "api" },
              { source: "api", target: "net" },
              { source: "api", target: "cfg" },
              { source: "net", target: "ws" },
              { source: "ui", target: "log" },
              { source: "ui", target: "fs" },
              { source: "test", target: "cli" },
              { source: "test", target: "api" },
            ],
          }}
          highlight="cli"
        />
      </FigTooltip>
    ),
  },
];
