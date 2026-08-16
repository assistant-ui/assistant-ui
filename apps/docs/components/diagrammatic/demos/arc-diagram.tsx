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
    title: "packages/* imports, file order",
    setup:
      "Nodes stay in repository order. Height is how far an import jumps. That is the only reason this is not a network.",
    read: "cli leaping to ws is the tallest arc and the next cut. test reaching back to cli is the second. Short hops from core to db to api are the healthy spine.",
    source: "Internal imports under packages/, August 2025.",
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
          density="figure"
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
