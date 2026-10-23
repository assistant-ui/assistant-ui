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
    title: "Checkout service connections",
    setup:
      "Ten services on the checkout path. Gateway and checkout each have four links, the highest degree in this graph.",
    read: "Gateway connects to checkout, auth, cart, and flags. Checkout connects to payments, inventory, pricing, and risk. Risk is the only service linked to both checkout and payments.",
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
        <Network aspect={1.2} title="Checkout service graph" graph={GRAPH} />
      </FigTooltip>
    ),
  },
];
