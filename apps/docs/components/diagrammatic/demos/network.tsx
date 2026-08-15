import { Network } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Service dependencies",
    setup:
      "An on-call engineer sketches the system before the incident review: services as nodes, calls as edges, the most-connected node pulled to the center by the layout itself.",
    read: "The api sits at the center because everything touches it — which is also the incident review's conclusion, drawn before anyone speaks. The unlabeled leaves are replicas; the web→db edge that skips the api is the shortcut that caused the outage.",
    chart: (
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
    ),
  },
  {
    title: "Who starts the group chats",
    setup:
      "A friend group jokes that one person holds them all together, so someone graphs a year of group-chat creation: who added whom, drawn as a network.",
    read: "The joke is structurally true. Maya links every cluster; delete her node and the graph falls into three islands that have never messaged each other. Sociologists call it brokerage — the group calls it Maya.",
    chart: (
      <Network
        title="Group chat graph"
        graph={{
          nodes: [
            { id: "maya", label: "maya" },
            { id: "leo", label: "leo" },
            { id: "iris", label: "iris" },
            { id: "tom", label: "tom" },
            { id: "ana", label: "ana" },
            { id: "kai", label: "kai" },
            { id: "f1" },
            { id: "f2" },
            { id: "f3" },
            { id: "f4" },
          ],
          links: [
            { source: "maya", target: "leo" },
            { source: "maya", target: "iris" },
            { source: "maya", target: "tom" },
            { source: "maya", target: "ana" },
            { source: "maya", target: "kai" },
            { source: "leo", target: "f1" },
            { source: "leo", target: "f2" },
            { source: "iris", target: "f3" },
            { source: "tom", target: "f4" },
            { source: "leo", target: "iris" },
          ],
        }}
      />
    ),
  },
  {
    title: "Routes out of a fortress hub",
    setup:
      "An aviation analyst draws a regional airline's network as a graph rather than a map, because the strategy question is connectivity, not geography.",
    read: "One hub, five focus cities, and the spokes that feed them: the fortress-hub model in its purest form. The single east–south edge that bypasses the hub is the experiment — if that route makes money, the whole shape is up for review.",
    chart: (
      <Network
        title="Airline route graph"
        graph={{
          nodes: [
            { id: "hub", label: "hub" },
            { id: "west", label: "west" },
            { id: "east", label: "east" },
            { id: "north", label: "north" },
            { id: "south", label: "south" },
            { id: "intl", label: "intl" },
            { id: "r1" },
            { id: "r2" },
            { id: "r3" },
            { id: "r4" },
            { id: "r5" },
          ],
          links: [
            { source: "hub", target: "west" },
            { source: "hub", target: "east" },
            { source: "hub", target: "north" },
            { source: "hub", target: "south" },
            { source: "hub", target: "intl" },
            { source: "west", target: "r1" },
            { source: "west", target: "r2" },
            { source: "east", target: "r3" },
            { source: "north", target: "r4" },
            { source: "intl", target: "r5" },
            { source: "east", target: "south" },
          ],
        }}
      />
    ),
  },
];
