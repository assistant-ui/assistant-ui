import { Waterfall } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const STEPS = [
  { label: "start 42.1", value: 42.1, total: true },
  { label: "new", value: 6.4 },
  { label: "expand", value: 3.1 },
  { label: "contract", value: -1.8 },
  { label: "churn", value: -2.4 },
  { label: "end 47.4", value: 47.4, total: true },
];

export const glyph = <Waterfall title="ARR bridge" steps={STEPS} />;

export const examples: DemoExample[] = [
  {
    title: "ARR bridge, Q2",
    setup:
      "Start, four signed steps, end. Connectors and sign colors do the reading. $ millions.",
    read: "New logos add 6.4. Expansion adds 3.1. Contraction and churn take 4.2 back. The quarter still closes 5.3 above where it opened. Churn is the slab the QBR will stay on.",
    source: "ARR roll-forward, Q2 2025. USD millions.",
    chart: (
      <FigTooltip
        labels={STEPS.map((step) => step.label)}
        series={{ ARR: ["42.1", "+6.4", "+3.1", "−1.8", "−2.4", "47.4"] }}
      >
        <Waterfall
          density="figure"
          aspect={1.8}
          title="ARR bridge"
          steps={STEPS}
          format={(v) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(1)}`}
        />
      </FigTooltip>
    ),
  },
];
