import { Hexbin } from "diagrammatic";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

const PICKUPS = Array.from({ length: 640 }, (_, i) => ({
  x: 50 + Math.sin(i * 2.1) * 26 + Math.sin(i * 0.37) * 14,
  y: 50 + Math.cos(i * 1.7) * 22 + Math.cos(i * 0.53) * 12,
}));

export const glyph = (
  <Hexbin title="Ride pickups over the city grid" points={PICKUPS} />
);

export const examples: DemoExample[] = [
  {
    title: "Ride pickups over the city grid",
    setup:
      "A ride-hail ops team has 640 pickup coordinates from one Friday night. As a scatter it is an unreadable smear of overplotted dots; hex-binned, the city gets a shape.",
    read: "Six hundred points become a readable surface, and the dark hexes are the nightlife district announcing itself. The second, smaller hot spot is the stadium — the event the surge-pricing model missed.",
    chart: (
      <Terminal title="pickups — fri night">
        <Hexbin title="Ride pickups over the city grid" points={PICKUPS} />
      </Terminal>
    ),
  },
];
