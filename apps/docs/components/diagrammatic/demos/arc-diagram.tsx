import { ArcDiagram } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Terminal } from "./scenes";

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
    read: "The tall arcs are the long-distance imports to worry about: cli reaching over five modules to ws is the coupling the next refactor should cut. Short, local arcs are healthy; height is distance, and distance is risk.",
    chart: (
      <Terminal title="imports — file order">
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
      </Terminal>
    ),
  },
  {
    title: "Which characters share scenes",
    setup:
      "A book club maps a novel's cast in order of first appearance, arcing every pair that shares a scene — the literary-network classic, flattened to one readable line.",
    read: "The hero's arcs reach everyone — that is what protagonist means, structurally — while the rival connects through exactly one scene. The longest arc, nora to finn, spans the whole book: the reunion the plot spends four hundred pages arranging.",
    chart: (
      <Paper kicker="Books" title="Who shares a scene">
        <ArcDiagram
          title="Shared scenes"
          graph={{
            nodes: ["nora", "sam", "vex", "ida", "rook", "muse", "finn"].map(
              (id) => ({ id }),
            ),
            links: [
              { source: "nora", target: "sam" },
              { source: "nora", target: "ida" },
              { source: "nora", target: "muse" },
              { source: "sam", target: "vex" },
              { source: "ida", target: "rook" },
              { source: "nora", target: "finn" },
              { source: "vex", target: "finn" },
            ],
          }}
          highlight="nora"
        />
      </Paper>
    ),
  },
  {
    title: "Express services skipping local stops",
    setup:
      "A transit planner draws one rail line with its stations in track order and each express service as an arc over the stops it skips.",
    read: "The terminal-to-airport arc clears five stations — the express that makes the airport line viable. Every arc's height is time saved and stops skipped; the local riders under the tallest arcs are the ones writing to the transit authority.",
    chart: (
      <AppCard title="Express arcs" meta="one line">
        <ArcDiagram
          title="Express service arcs"
          graph={{
            nodes: [
              "terminal",
              "mills",
              "park",
              "center",
              "docks",
              "east",
              "airport",
            ].map((id) => ({ id })),
            links: [
              { source: "terminal", target: "center" },
              { source: "terminal", target: "airport" },
              { source: "center", target: "airport" },
              { source: "mills", target: "docks" },
              { source: "park", target: "east" },
            ],
          }}
          highlight="terminal"
        />
      </AppCard>
    ),
  },
];
