import { Network } from "diagrammatic";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

export const glyph = (
  <Network
    title="Service dependencies"
    graph={{
      nodes: [
        { id: "api", label: "api" },
        { id: "web", label: "web" },
        { id: "db", label: "db" },
        { id: "jobs", label: "jobs" },
        { id: "cache", label: "cache" },
        { id: "auth", label: "auth" },
        { id: "w1" },
        { id: "w2" },
        { id: "d1" },
        { id: "d2" },
        { id: "j1" },
        { id: "c1" },
      ],
      links: [
        { source: "api", target: "web" },
        { source: "api", target: "db" },
        { source: "api", target: "jobs" },
        { source: "api", target: "cache" },
        { source: "api", target: "auth" },
        { source: "web", target: "w1" },
        { source: "web", target: "w2" },
        { source: "db", target: "d1" },
        { source: "db", target: "d2" },
        { source: "jobs", target: "j1" },
        { source: "cache", target: "c1" },
        { source: "web", target: "db" },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Service dependencies",
    setup:
      "An on-call engineer sketches the system before the incident review: services as nodes, calls as edges, the most-connected node pulled to the center by the layout itself.",
    read: "The api sits at the center because six services touch it — which is also the incident review's conclusion, drawn before anyone speaks. The unlabeled leaves are replicas; the two edges that skip the api entirely, web→db and jobs→search, are the shortcuts the outage traced.",
    chart: (
      <Terminal title="service graph — prod">
        <Network
          title="Service dependencies"
          graph={{
            nodes: [
              { id: "api", label: "api" },
              { id: "web", label: "web" },
              { id: "db", label: "db" },
              { id: "jobs", label: "jobs" },
              { id: "cache", label: "cache" },
              { id: "auth", label: "auth" },
              { id: "search", label: "search" },
              { id: "w1" },
              { id: "w2" },
              { id: "d1" },
              { id: "d2" },
              { id: "j1" },
              { id: "j2" },
              { id: "c1" },
              { id: "s1" },
              { id: "a1" },
            ],
            links: [
              { source: "api", target: "web" },
              { source: "api", target: "db" },
              { source: "api", target: "jobs" },
              { source: "api", target: "cache" },
              { source: "api", target: "auth" },
              { source: "api", target: "search" },
              { source: "web", target: "w1" },
              { source: "web", target: "w2" },
              { source: "db", target: "d1" },
              { source: "db", target: "d2" },
              { source: "jobs", target: "j1" },
              { source: "jobs", target: "j2" },
              { source: "cache", target: "c1" },
              { source: "search", target: "s1" },
              { source: "auth", target: "a1" },
              { source: "web", target: "db" },
              { source: "jobs", target: "search" },
            ],
          }}
        />
      </Terminal>
    ),
  },
];
