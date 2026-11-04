import { Waffle } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const DEPLOYS = [
  { label: "clean", value: 91 },
  { label: "rollback", value: 6 },
  { label: "hotfix", value: 3 },
];

export const glyph = <Waffle title="Last 100 deploys" items={DEPLOYS} />;

export const examples: DemoExample[] = [
  {
    title: "Last 100 production deploys",
    setup:
      "One cell, one deploy. A waffle is for shares you can count with a finger, not a famous fact about the planet.",
    read: "The grid contains 91 clean deploys, six rollbacks, and three hotfixes. Clean deploys account for 91% of the 100 cells.",
    source: "Production deploys, trailing 100.",
    chart: (
      <FigTooltip
        labels={DEPLOYS.map((row) => row.label)}
        series={{ deploys: DEPLOYS.map((row) => row.value) }}
      >
        <Waffle
          aspect={1.2}
          title="Last 100 production deploys"
          items={DEPLOYS}
        />
      </FigTooltip>
    ),
  },
  {
    title: "A budget split on a hex waffle",
    setup:
      "A household divides every budget dollar among spending, money still available, and savings. Each hexagon represents one percent of the budget.",
    read: "Of 100 cells, 52 are spent, 33 remain available, and 15 are saved.",
    chart: (
      <Waffle
        mark="hex"
        title="Budget split"
        items={[
          { label: "spent", value: 52 },
          { label: "remaining", value: 33 },
          { label: "saved", value: 15 },
        ]}
      />
    ),
    source: "Illustrative household budget.",
  },
];
