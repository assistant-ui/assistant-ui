import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const MODULES = ["cli", "core", "ui", "db", "api", "ws", "log", "cfg"];
const POSITIONS = [22, 46, 70, 94, 118, 142, 166, 188];
const IMPORTS: Array<[number, number, boolean]> = [
  [0, 2, false],
  [0, 5, true],
  [1, 3, false],
  [2, 6, false],
  [3, 4, false],
  [4, 7, false],
  [1, 6, false],
];

export function ArcDiagramChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="14"
        y1="92"
        x2="194"
        y2="92"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      {IMPORTS.map(([from, to, accent], i) => {
        const x0 = POSITIONS[from]!;
        const x1 = POSITIONS[to]!;
        const r = (x1 - x0) / 2;
        return (
          <path
            key={i}
            d={`M${x0} 92 A${r} ${r * 0.82} 0 0 1 ${x1} 92`}
            fill="none"
            {...(accent ? { stroke: BLUE } : {})}
            className={accent ? "" : "stroke-foreground/30"}
            {...(accent ? stroke.line : stroke.hair)}
          />
        );
      })}
      {POSITIONS.map((x, i) => (
        <g key={MODULES[i]}>
          <circle
            cx={x}
            cy="92"
            r={i === 0 || i === 5 ? 4 : 3}
            {...(i === 0 || i === 5 ? { fill: BLUE } : {})}
            className={i === 0 || i === 5 ? "" : "fill-foreground/50"}
          />
          <text x={x} y="104" textAnchor="middle" {...TXT.axis}>
            {MODULES[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
