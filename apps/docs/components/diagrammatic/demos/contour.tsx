import { Contour } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report } from "./scenes";

const RUNNERS = Array.from({ length: 400 }, (_, i) => ({
  x: 172 + Math.sin(i * 1.9) * 11 + Math.sin(i * 0.41) * 6,
  y: 68 + Math.sin(i * 1.9) * 6.5 + Math.cos(i * 0.67) * 4,
}));

const DARTS = Array.from({ length: 380 }, (_, i) => ({
  x: 0 + Math.sin(i * 2.3) * 4.2 + Math.sin(i * 0.61) * 2.4 + 1.1,
  y: 0 + Math.cos(i * 1.9) * 4.8 + Math.cos(i * 0.47) * 2.2 - 1.6,
}));

const SIGHTINGS = Array.from({ length: 420 }, (_, i) => ({
  x: 14 + Math.sin(i * 2.1) * 4.5 + Math.sin(i * 0.53) * 2.5,
  y:
    1450 -
    (Math.sin(i * 2.1) * 4.5 + Math.sin(i * 0.53) * 2.5) * 48 +
    Math.cos(i * 0.71) * 130,
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
  {
    title: "Four hundred darts at one board",
    setup:
      "A darts coach records a month of practice throws as coordinates from the bullseye, hunting for the systematic error inside the randomness.",
    read: "The cloud centers low-right of the bull — the contours are the player's bias, drawn. Practice tightens the rings; only technique changes will move their center, and now the coach can point at exactly where it sits.",
    chart: (
      <AppCard title="Practice, mapped" meta="380 throws">
        <Contour
          title="Dart landing positions"
          points={DARTS}
          xLabel="cm from center"
          yLabel="cm from center"
        />
      </AppCard>
    ),
  },
  {
    title: "Warbler sightings by temperature and elevation",
    setup:
      "An ornithology project pools 420 sightings, each logged with that day's temperature and the site's elevation, to see the species' comfort zone as a shape.",
    read: "One tilted ridge: as the season warms, the birds simply move uphill, trading altitude for the same felt temperature. The contour's slope is the species' thermal preference — and a preview of where a warmer century pushes it.",
    chart: (
      <Paper
        kicker="Birds"
        title="The warbler's window"
        source="Source: 420 logged sightings"
      >
        <Contour
          title="Sightings by temp and elevation"
          points={SIGHTINGS}
          xLabel="temp (°c)"
          yLabel="elevation (m)"
        />
      </Paper>
    ),
  },
];
