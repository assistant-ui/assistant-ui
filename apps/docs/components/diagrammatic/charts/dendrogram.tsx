import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const TOPICS = [
  "login",
  "2fa",
  "billing",
  "refund",
  "export",
  "api",
  "mobile",
  "other",
];
const LEAVES = [24, 46, 68, 90, 112, 134, 156, 178];

const BRACKETS = [
  { x1: 24, x2: 46, y: 80, d1: 96, d2: 96, accent: true },
  { x1: 68, x2: 90, y: 72, d1: 96, d2: 96, accent: false },
  { x1: 35, x2: 79, y: 56, d1: 80, d2: 72, accent: true },
  { x1: 112, x2: 134, y: 76, d1: 96, d2: 96, accent: false },
  { x1: 156, x2: 178, y: 66, d1: 96, d2: 96, accent: false },
  { x1: 123, x2: 167, y: 48, d1: 76, d2: 66, accent: false },
  { x1: 57, x2: 145, y: 22, d1: 56, d2: 48, accent: false },
];

export function DendrogramChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {BRACKETS.map((b, i) => (
        <path
          key={i}
          d={`M${b.x1} ${b.d1} V${b.y} H${b.x2} V${b.d2}`}
          fill="none"
          {...(b.accent ? { stroke: BLUE, strokeOpacity: 0.8 } : {})}
          className={b.accent ? "" : "stroke-foreground/30"}
          {...stroke.hair}
        />
      ))}
      {LEAVES.map((x, i) => (
        <g key={TOPICS[i]}>
          <circle
            cx={x}
            cy="96"
            r="3"
            {...(i < 2 ? { fill: BLUE } : {})}
            className={i < 2 ? "" : "fill-foreground/45"}
          />
          <text x={x} y="108" textAnchor="middle" {...TXT.axis}>
            {TOPICS[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
