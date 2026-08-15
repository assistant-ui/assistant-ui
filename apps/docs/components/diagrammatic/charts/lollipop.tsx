import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const TEAMS = [
  { label: "support", value: 58 },
  { label: "sales", value: 84 },
  { label: "eng", value: 40 },
  { label: "ops", value: 66 },
  { label: "design", value: 92 },
  { label: "hr", value: 48 },
];

export function LollipopChart() {
  const max = Math.max(...TEAMS.map((t) => t.value));
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="10"
        y1="100"
        x2="190"
        y2="100"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      {TEAMS.map((team, i) => {
        const x = 26 + i * 30;
        const y = 100 - team.value * 0.82;
        const top = team.value === max;
        return (
          <g key={team.label}>
            <line
              x1={x}
              y1="100"
              x2={x}
              y2={y + 4}
              className="stroke-foreground/30"
              {...stroke.medium}
            />
            <circle
              cx={x}
              cy={y}
              r="4.5"
              {...(top ? { fill: BLUE } : {})}
              className={top ? "" : "fill-foreground/55"}
            />
            {top && (
              <text x={x} y={y - 7} textAnchor="middle" {...TXT.value}>
                92
              </text>
            )}
            <text x={x} y="112" textAnchor="middle" {...TXT.axis}>
              {team.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
