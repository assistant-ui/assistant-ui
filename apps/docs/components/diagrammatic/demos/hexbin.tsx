import { Hexbin } from "diagrammatic";
import type { DemoExample } from "./types";

function gaussian(
  n: number,
  seed: number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
) {
  const points: { x: number; y: number }[] = [];
  let s = seed;
  for (let i = 0; i < n; i += 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const u1 = ((s >>> 8) + 1) / 16777216;
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const u2 = (s >>> 8) / 16777216;
    const r = Math.sqrt(-2 * Math.log(u1));
    const t = 2 * Math.PI * u2;
    points.push({ x: cx + r * Math.cos(t) * sx, y: cy + r * Math.sin(t) * sy });
  }
  return points;
}

const PICKUPS = [
  ...gaussian(1600, 7, 38, 42, 10, 8),
  ...gaussian(900, 19, 68, 58, 7, 6),
  ...gaussian(400, 31, 22, 70, 5, 4),
  ...gaussian(200, 47, 80, 22, 12, 9),
];

export const glyph = (
  <Hexbin
    title="Friday pickups"
    points={PICKUPS.filter((_, i) => i % 8 === 0)}
  />
);

export const examples: DemoExample[] = [
  {
    title: "3,100 Friday-night pickups",
    setup:
      "Three thousand points as a scatter is a smear. Hexes keep the empty cells empty and let two neighborhoods announce themselves.",
    read: "The dark mass is downtown after 22h. The second core is the stadium letting out. The pale spray toward the airport is real and thin. Empty hexes on the water are the map telling the truth.",
    source: "Ride-hail pickups, Friday 20:00 to 02:00. n = 3,100.",
    chart: (
      <Hexbin
        density="figure"
        aspect={1.55}
        title="Friday-night pickups"
        points={PICKUPS}
        radius={6.4}
      />
    ),
  },
];
