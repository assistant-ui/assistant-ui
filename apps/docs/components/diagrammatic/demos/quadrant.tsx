import { Quadrant } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const BETS = [
  { x: 2.4, y: 82, label: "SSO" },
  { x: 3.1, y: 74, label: "audit log" },
  { x: 4.0, y: 61, label: "CSV export" },
  { x: 9.2, y: 88, label: "EU region" },
  { x: 10.0, y: 79, label: "offline" },
  { x: 8.6, y: 70, label: "voice" },
  { x: 1.5, y: 28, label: "themes" },
  { x: 3.4, y: 22, label: "stickers" },
  { x: 2.8, y: 12, label: "confetti" },
  { x: 8.8, y: 24, label: "rewrite" },
  { x: 10.2, y: 31, label: "new editor" },
  { x: 10.5, y: 19, label: "native app" },
  { x: 6.0, y: 52, label: "billing v2" },
];

export const glyph = (
  <Quadrant
    title="Roadmap bets"
    points={BETS.map(({ label: _label, ...pt }) => pt)}
    xLabel="weeks"
    yLabel="reach"
    quadrants={["now", "bets", "later", "no"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Q3 roadmap bets",
    setup:
      "Thirteen named bets. X is weeks of engineering. Y is reachable weekly actives, in thousands. The crosshair is 50k users and six weeks, which is the staffing we actually have.",
    read: "SSO and the audit log sit in the now corner. EU region is the only bet worth a quarter. The rewrite and the native app are in the no box on purpose. Billing v2 sits on the cut, which is the only debate still open.",
    source: "Q3 planning, 12 Aug 2025. Cuts at 6 weeks and 50k WAU.",
    chart: (
      <FigTooltip
        labels={BETS.map((row) => row.label)}
        series={{
          weeks: BETS.map((row) => row.x),
          "WAU k": BETS.map((row) => row.y),
        }}
      >
        <Quadrant
          density="figure"
          aspect={1.45}
          title="Q3 roadmap bets"
          points={BETS}
          xLabel="weeks of work"
          yLabel="reachable WAU (k)"
          quadrants={["ship now", "staff a bet", "later", "do not"]}
        />
      </FigTooltip>
    ),
  },
];
