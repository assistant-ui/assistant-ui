import { BLUE, TXT, VIEWBOX, seqOpacity } from "./lib";

const SERVICES = ["api", "web", "db", "jobs", "cdn"];
const HOURS = ["8", "10", "12", "14", "16", "18", "20", "22"];
const GRID = [
  [0.2, 0.4, 0.7, 0.5, 0.3, 0.2, 0.1, 0.15],
  [0.3, 0.6, 0.9, 0.7, 0.5, 0.3, 0.2, 0.1],
  [0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.3, 0.2],
  [0.1, 0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.3],
  [0.05, 0.2, 0.3, 0.4, 0.6, 0.8, 0.5, 0.4],
];

export function HeatmapChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {GRID.map((row, r) => (
        <g key={r}>
          <text x="8" y={10 + r * 19 + 11} {...TXT.axis}>
            {SERVICES[r]}
          </text>
          {row.map((v, c) => (
            <rect
              key={c}
              x={30 + c * 20}
              y={10 + r * 19}
              width="18"
              height="17"
              rx="3"
              fill={BLUE}
              opacity={seqOpacity(v)}
            />
          ))}
        </g>
      ))}
      {HOURS.map((h, c) => (
        <text key={h} x={39 + c * 20} y="113" textAnchor="middle" {...TXT.axis}>
          {h}h
        </text>
      ))}
    </svg>
  );
}
