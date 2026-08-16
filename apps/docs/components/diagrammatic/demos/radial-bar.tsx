import { RadialBar } from "diagrammatic";
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
    read: "Ship is nearly closed, hiring barely started — the arc lengths rank the quarter's attention at a glance. Inner rings read slightly shorter than outer ones at equal fractions by geometry alone; keep the ring count low and the comparison casual.",
    chart: (
      <AppCard title="Quarterly goals" meta="week 6">
        <RadialBar
          title="Quarterly goals"
          items={[
            { label: "ship", value: 0.82 },
            { label: "quality", value: 0.58 },
            { label: "hiring", value: 0.36 },
          ]}
        />
      </AppCard>
    ),
  },
];
