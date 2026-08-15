import { Hexbin } from "diagrammatic";

const PICKUPS = Array.from({ length: 640 }, (_, i) => ({
  x: 50 + Math.sin(i * 2.1) * 26 + Math.sin(i * 0.37) * 14,
  y: 50 + Math.cos(i * 1.7) * 22 + Math.cos(i * 0.53) * 12,
}));

export function HexbinDemo() {
  return <Hexbin title="Ride pickups over the city grid" points={PICKUPS} />;
}
