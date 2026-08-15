import { CAT, TXT, VIEWBOX, polar, round } from "./lib";

const GOALS = [
  { label: "ship", value: 0.82, r: 44 },
  { label: "quality", value: 0.58, r: 33 },
  { label: "hiring", value: 0.36, r: 22 },
];

function arcStroke(r: number, sweep: number): string {
  const a0 = -Math.PI / 2;
  const a1 = a0 + sweep * Math.PI * 2;
  const start = polar(64, 60, r, a0);
  const end = polar(64, 60, r, a1);
  const large = sweep > 0.5 ? 1 : 0;
  return `M${round(start.x)} ${round(start.y)} A${r} ${r} 0 ${large} 1 ${round(end.x)} ${round(end.y)}`;
}

export function RadialBarChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {GOALS.map((goal, i) => (
        <g key={goal.label}>
          <g fill="none" strokeLinecap="round" strokeWidth="7">
            <circle
              cx="64"
              cy="60"
              r={goal.r}
              className="stroke-foreground/8"
            />
            <path
              d={arcStroke(goal.r, goal.value)}
              stroke={CAT[i]}
              opacity="0.9"
            />
          </g>
          <circle cx="128" cy={40 + i * 16} r="2.4" fill={CAT[i]} />
          <text x="134" y={40 + i * 16 + 1.8} {...TXT.label}>
            {goal.label}
          </text>
          <text x="186" y={40 + i * 16 + 1.8} textAnchor="end" {...TXT.value}>
            {Math.round(goal.value * 100)}%
          </text>
        </g>
      ))}
    </svg>
  );
}
