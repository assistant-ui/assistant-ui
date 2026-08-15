import { BLUE, Legend, TXT, VIEWBOX, stroke } from "./lib";

const PAGES = [
  { label: "home", before: 38, after: 84 },
  { label: "search", before: 52, after: 76 },
  { label: "checkout", before: 66, after: 58 },
  { label: "profile", before: 30, after: 54 },
  { label: "api docs", before: 44, after: 92 },
];

const X = (v: number) => 44 + v * 1.44;

export function DumbbellChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <Legend
        x={192}
        y={11}
        anchor="end"
        items={[
          { label: "before", className: "fill-foreground/45" },
          { label: "after", fill: BLUE },
        ]}
      />
      {PAGES.map((row, i) => {
        const y = 26 + i * 19.5;
        return (
          <g key={row.label}>
            <text x="8" y={y + 1.8} {...TXT.axis}>
              {row.label}
            </text>
            <line
              x1={X(row.before)}
              y1={y}
              x2={X(row.after)}
              y2={y}
              className="stroke-foreground/25"
              {...stroke.line}
            />
            <circle
              cx={X(row.before)}
              cy={y}
              r="4"
              className="fill-foreground/45"
            />
            <circle cx={X(row.after)} cy={y} r="4" fill={BLUE} />
          </g>
        );
      })}
    </svg>
  );
}
