import { Contour } from "diagrammatic";
import type { DemoExample } from "./types";

function cloud(
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

const REVIEWS = [
  ...cloud(220, 3, 4, 3.2, 2.2, 1.4),
  ...cloud(80, 11, 18, 8.5, 4.5, 3.2),
];

export const glyph = (
  <Contour
    title="Review hours against files"
    points={REVIEWS.filter((_, i) => i % 6 === 0)}
    xLabel="files"
    yLabel="hours"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Review hours against files changed",
    setup:
      "Three hundred pull requests as density, not dots. Each ring is a covariance ellipse around the points.",
    read: "Most reviews are small diffs answered within a few hours. A smaller group of large diffs takes most of a working day. Bigger diffs wait longer, and the rings say by how much.",
    source: "Illustrative first-review hours against files changed. n = 300.",
    chart: (
      <Contour
        aspect={1.6}
        title="Review hours against files changed"
        points={REVIEWS}
        xLabel="files changed"
        yLabel="hours to first review"
      />
    ),
  },
];
