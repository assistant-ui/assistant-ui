import { Funnel } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const STAGES = [
  { label: "view cart", value: 18_420 },
  { label: "address", value: 11_240 },
  { label: "payment", value: 9_010 },
  { label: "confirm", value: 6_280 },
  { label: "paid", value: 5_810 },
];

export const glyph = <Funnel title="Checkout" items={STAGES.slice(0, 4)} />;

export const examples: DemoExample[] = [
  {
    title: "Checkout, one Wednesday",
    setup:
      "Five stages, each a subset of the last. The taper shows the remaining sessions; the rate on every step shows the loss.",
    read: "Address loses 39% of the cart. Payment holds most of who remain. Confirm is the second cliff: 30% leave between payment and confirmation. Paid is 31.5% of view-cart, and almost everyone who confirms pays.",
    source: "Checkout POST funnel, Wednesday 13 Aug. n = 18,420 carts.",
    chart: (
      <FigTooltip
        labels={STAGES.map((row) => row.label)}
        series={{ sessions: STAGES.map((row) => row.value) }}
      >
        <Funnel aspect={1.35} title="Checkout funnel" rates items={STAGES} />
      </FigTooltip>
    ),
  },
];
