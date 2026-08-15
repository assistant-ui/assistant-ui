import { BLUE, TXT, VIEWBOX, polar, ring, round, seqOpacity } from "./lib";

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const HOURS = [0.9, 0.55, 0.75, 0.4, 0.62, 0.3, 0.5, 0.7];

export function PolarAreaChart() {
  const slice = (Math.PI * 2) / HOURS.length;
  const gap = 0.035;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {HOURS.map((v, i) => (
        <path
          key={i}
          d={ring(
            100,
            62,
            6,
            8 + v * 42,
            i * slice + gap,
            (i + 1) * slice - gap,
          )}
          fill={BLUE}
          opacity={seqOpacity(v)}
        />
      ))}
      {DIRECTIONS.map((dir, i) => {
        const angle = i * slice + slice / 2 - Math.PI / 2;
        const p = polar(100, 62, 56, angle);
        return (
          <text
            key={dir}
            x={round(p.x)}
            y={round(p.y) + 1.6}
            textAnchor="middle"
            {...TXT.axis}
          >
            {dir}
          </text>
        );
      })}
    </svg>
  );
}
