import { Hexbin } from "diagrammatic";
import type { DemoExample } from "./types";

const PICKUPS = Array.from({ length: 640 }, (_, i) => ({
  x: 50 + Math.sin(i * 2.1) * 26 + Math.sin(i * 0.37) * 14,
  y: 50 + Math.cos(i * 1.7) * 22 + Math.cos(i * 0.53) * 12,
}));

const SHOTS = Array.from({ length: 560 }, (_, i) => {
  const ring = i % 3;
  const angle = i * 2.399;
  const radius =
    ring === 0 ? 8 + (i % 7) : ring === 1 ? 30 + (i % 9) : 44 + (i % 5);
  return {
    x: 50 + Math.cos(angle) * radius * 0.9,
    y: 62 - Math.abs(Math.sin(angle)) * radius * 0.8,
  };
});

const STRIKES = Array.from({ length: 520 }, (_, i) => ({
  x: 30 + ((i * 13) % 47) + Math.sin(i * 0.9) * 9,
  y: 24 + (i % 11) * 4.6 + Math.sin(i * 1.7) * 7 + ((i * 13) % 47) * 0.34,
}));

export const examples: DemoExample[] = [
  {
    title: "Ride pickups over the city grid",
    setup:
      "A ride-hail ops team has 640 pickup coordinates from one Friday night. As a scatter it is an unreadable smear of overplotted dots; hex-binned, the city gets a shape.",
    read: "Six hundred points become a readable surface, and the dark hexes are the nightlife district announcing itself. The second, smaller hot spot is the stadium — the event the surge-pricing model missed.",
    chart: <Hexbin title="Ride pickups over the city grid" points={PICKUPS} />,
  },
  {
    title: "A season of basketball shots",
    setup:
      "A team analyst bins a season of 560 shot locations over the half-court, because modern offense theory is an argument about geography.",
    read: "Two dark bands — rim and arc — with the long midrange faded between them. The empty middle is not missing data; it is the analytics department winning the argument, one shot chart at a time.",
    chart: <Hexbin title="Shot locations, one season" points={SHOTS} />,
  },
  {
    title: "Lightning strikes across a valley",
    setup:
      "A meteorology station aggregates a summer of strike coordinates. Individual storms are chaos; a season of them, binned, is climate.",
    read: "The dark cells run in a diagonal band — the storms follow the ridge line, and the binning makes the terrain speak. The valley floor's pale hexes are why the campgrounds are where they are.",
    chart: <Hexbin title="Lightning strikes, one summer" points={STRIKES} />,
  },
];
