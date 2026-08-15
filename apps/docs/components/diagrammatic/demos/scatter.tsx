import { Scatter } from "diagrammatic";
import type { DemoExample } from "./types";

const GADGETS = Array.from({ length: 26 }, (_, i) => ({
  x: 4 + i * 3 + (i % 5),
  y: 2.1 + i * 0.09 + (i % 7) * 0.05,
}));

const GELATO = Array.from({ length: 24 }, (_, i) => ({
  x: 12 + i + (i % 4),
  y: 40 + i * 14 + (i % 5) * 18 - (i % 3) * 12,
}));

const EARBUDS = Array.from({ length: 22 }, (_, i) => ({
  x: 49 + i * 14 + (i % 3) * 9,
  y: 4.5 + ((i * 7) % 11) * 0.42 + (i % 4) * 0.3,
}));

export const examples: DemoExample[] = [
  {
    title: "Rating against hours of use",
    note: "Each dot is a device; the trend line says familiarity breeds fondness.",
    chart: (
      <Scatter
        title="Rating against hours of use"
        points={GADGETS}
        trend
        xLabel="hours of use"
        yLabel="rating"
      />
    ),
  },
  {
    title: "Gelato sales against afternoon temperature",
    note: "The classic correlation: every degree is worth a tray.",
    chart: (
      <Scatter
        title="Gelato sales by temperature"
        points={GELATO}
        trend
        xLabel="high (°c)"
        yLabel="scoops sold"
      />
    ),
  },
  {
    title: "Earbud price against battery life",
    note: "A cloud with no slope: paying more buys brand, not hours.",
    chart: (
      <Scatter
        title="Price against battery life"
        points={EARBUDS}
        xLabel="price ($)"
        yLabel="battery (h)"
      />
    ),
  },
];
