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
    note: "Six hundred points become a readable surface; the dark hexes are the nightlife.",
    chart: <Hexbin title="Ride pickups over the city grid" points={PICKUPS} />,
  },
  {
    title: "A season of basketball shots",
    note: "Two dark bands, rim and arc, with the long midrange fading between them.",
    chart: <Hexbin title="Shot locations, one season" points={SHOTS} />,
  },
  {
    title: "Lightning strikes across a valley",
    note: "The storms follow the ridge line; the diagonal of dark cells is the terrain speaking.",
    chart: <Hexbin title="Lightning strikes, one summer" points={STRIKES} />,
  },
];
