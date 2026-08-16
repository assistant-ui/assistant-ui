import { ArcDiagram } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

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
      "A codebase tour keeps the modules in file order — the order a reader meets them — and draws each import as an arc overhead. Order is sacred here; that is the arc diagram's difference from a network.",
    read: "The tall arcs are the long-distance imports to worry about: cli reaching over nine modules to ws is the coupling the next refactor should cut, and test reaching back across the whole file to cli is the second. Short, local arcs are healthy; height is distance, and distance is risk.",
    chart: (
      <Terminal title="imports — file order">
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
      </Terminal>
    ),
  },
];
