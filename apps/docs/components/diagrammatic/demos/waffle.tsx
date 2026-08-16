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
    read: "Ninety-one green cells. Six rollbacks sit in a run, which is the bad week in March. Three hotfixes are scattered. The SLO is 95 clean; the board can count the miss without a caption.",
    source:
      "Production deploys, trailing 100. Rollback means revert within 2h.",
    chart: (
      <FigTooltip
        labels={DEPLOYS.map((row) => row.label)}
        series={{ deploys: DEPLOYS.map((row) => row.value) }}
      >
        <Waffle
          density="figure"
          aspect={1.2}
          title="Last 100 production deploys"
          items={DEPLOYS}
        />
      </FigTooltip>
    ),
  },
];
