import { Contour } from "diagrammatic";
import type { DemoExample } from "./types";

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

export const examples: DemoExample[] = [
  {
    title: "Height and weight of 5k runners",
    note: "The rings are density; most of the field lives inside the second contour.",
    chart: (
      <Contour
        title="Height and weight of 5k runners"
        points={RUNNERS}
        xLabel="height (cm)"
        yLabel="weight (kg)"
      />
    ),
  },
  {
    title: "Four hundred darts at one board",
    note: "The cloud centers low-right of the bull; the contours are the player's bias, drawn.",
    chart: (
      <Contour
        title="Dart landing positions"
        points={DARTS}
        xLabel="cm from center"
        yLabel="cm from center"
      />
    ),
  },
  {
    title: "Warbler sightings by temperature and elevation",
    note: "One tilted ridge: as the season warms, the birds simply move uphill.",
    chart: (
      <Contour
        title="Sightings by temp and elevation"
        points={SIGHTINGS}
        xLabel="temp (°c)"
        yLabel="elevation (m)"
      />
    ),
  },
];
