import { Contour } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

const RUNNERS = Array.from({ length: 400 }, (_, i) => ({
  x: 172 + Math.sin(i * 1.9) * 11 + Math.sin(i * 0.41) * 6,
  y: 68 + Math.sin(i * 1.9) * 6.5 + Math.cos(i * 0.67) * 4,
}));

export const glyph = (
  <Contour
    title="Height and weight of 5k runners"
    points={RUNNERS}
    xLabel="height (cm)"
    yLabel="weight (kg)"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Height and weight of 5k runners",
    setup:
      "A sports scientist plots four hundred race entrants by height and weight, then asks the chart to summarize instead of scatter: contour rings trace equal density.",
    read: "Most of the field lives inside the second ring — the sport's physiological center of gravity. The rings' tilt is the correlation itself: taller entrants weigh more, and the ellipse's angle quantifies the 'of course'.",
    chart: (
      <Report title="Height × weight, 5k field" chip="n = 400">
        <Contour
          title="Height and weight of 5k runners"
          points={RUNNERS}
          xLabel="height (cm)"
          yLabel="weight (kg)"
        />
      </Report>
    ),
  },
];
