import { RadialBar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <RadialBar
    title="Quarterly goals"
    items={[
      { label: "ship", value: 0.82 },
      { label: "quality", value: 0.58 },
      { label: "hiring", value: 0.36 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Quarterly goals, fraction complete",
    setup:
      "An OKR dashboard shows three goals as arcs, each sweeping toward its own 100%. The circle is a design choice, and an honest chart admits its cost up front.",
    read: "Ship is nearly closed, docs barely started — five arc lengths rank the quarter's attention at a glance, and the gap between the top pair and the bottom pair is the standup agenda. Inner rings read slightly shorter than outer ones at equal fractions by geometry alone; keep the ring count low and the comparison casual.",
    chart: (
      <AppCard title="Quarterly goals" meta="week 6">
        <FigTooltip
          labels={["ship", "quality", "growth", "hiring", "docs"]}
          series={{ complete: ["82%", "64%", "51%", "36%", "22%"] }}
        >
          <RadialBar
            title="Quarterly goals"
            items={[
              { label: "ship", value: 0.82 },
              { label: "quality", value: 0.64 },
              { label: "growth", value: 0.51 },
              { label: "hiring", value: 0.36 },
              { label: "docs", value: 0.22 },
            ]}
          />
        </FigTooltip>
      </AppCard>
    ),
  },
];
