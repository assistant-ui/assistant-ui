import { Network } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const GRAPH = {
  nodes: [
    { id: "gw", label: "gateway" },
    { id: "checkout", label: "checkout" },
    { id: "pay", label: "payments" },
    { id: "inv", label: "inventory" },
    { id: "price", label: "pricing" },
    { id: "auth", label: "auth" },
    { id: "cart", label: "cart" },
    { id: "risk", label: "risk" },
    { id: "email", label: "email" },
    { id: "flag", label: "flags" },
  ],
  links: [
    { source: "gw", target: "checkout" },
    { source: "gw", target: "auth" },
    { source: "gw", target: "cart" },
    { source: "gw", target: "flag" },
    { source: "checkout", target: "pay" },
    { source: "checkout", target: "inv" },
    { source: "checkout", target: "price" },
    { source: "checkout", target: "risk" },
    { source: "pay", target: "risk" },
    { source: "pay", target: "email" },
    { source: "cart", target: "inv" },
    { source: "auth", target: "flag" },
  ],
};

export const glyph = (
  <Network
    title="Checkout path"
    graph={{
      nodes: GRAPH.nodes.slice(0, 6),
      links: GRAPH.links.slice(0, 6),
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "The gateway sits in the middle on purpose",
    setup:
      "Ten services on the checkout path. The layout pulls the highest-degree node to the center. That node is the gateway. Find it before the incident review starts.",
    read: "Gateway has four edges. Checkout has four more behind it. A page on gateway is a page on the store. The risk service is the only box both checkout and payments touch, which is why it showed up in two timelines.",
    source: "Service graph from the checkout trace sample, 14 Aug.",
    chart: (
      <FigTooltip
        entries={{
          gateway: "4 links",
          checkout: "4 links",
          payments: "3 links",
          inventory: "2 links",
          pricing: "1 link",
          auth: "2 links",
          cart: "2 links",
          risk: "2 links",
          email: "1 link",
          flags: "2 links",
        }}
      >
        <Network
          density="figure"
          aspect={1.2}
          title="Checkout service graph"
          graph={GRAPH}
        />
      </FigTooltip>
    ),
  },
];
