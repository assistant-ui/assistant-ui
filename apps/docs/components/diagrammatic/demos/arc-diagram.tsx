import { ArcDiagram } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Module imports in file order",
    note: "Nodes keep their sequence; the tall arcs are the long-distance imports to worry about.",
    chart: (
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
    ),
  },
  {
    title: "Which characters share scenes",
    note: "The cast in order of first appearance; the hero's arcs reach everyone, the rival's reach one.",
    chart: (
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
    ),
  },
  {
    title: "Express services skipping local stops",
    note: "Stations stay in track order; each arc is a service that skips everything beneath it.",
    chart: (
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
    ),
  },
];
