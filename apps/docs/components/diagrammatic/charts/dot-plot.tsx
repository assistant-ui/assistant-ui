import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const ROLES = [
  { label: "staff", value: 88 },
  { label: "senior", value: 72 },
  { label: "pm", value: 61 },
  { label: "mid", value: 47 },
  { label: "junior", value: 34 },
  { label: "intern", value: 22 },
];

const X = (v: number) => 42 + v * 1.5;

export function DotPlotChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {[
        { v: 20, label: "$80k" },
        { v: 55, label: "$130k" },
        { v: 90, label: "$180k" },
      ].map((tick) => (
        <g key={tick.label}>
          <line
            x1={X(tick.v)}
            y1="8"
            x2={X(tick.v)}
            y2="100"
            className="stroke-foreground/8"
            {...stroke.hair}
          />
          <text x={X(tick.v)} y="112" textAnchor="middle" {...TXT.axis}>
            {tick.label}
          </text>
        </g>
      ))}
      {ROLES.map((role, i) => {
        const y = 14 + i * 15.6;
        const top = i === 0;
        return (
          <g key={role.label}>
            <text x="8" y={y + 1.8} {...TXT.axis}>
              {role.label}
            </text>
            <line
              x1="42"
              y1={y}
              x2="186"
              y2={y}
              className="stroke-foreground/8"
              {...stroke.hair}
            />
            <circle
              cx={X(role.value)}
              cy={y}
              r="4"
              {...(top ? { fill: BLUE } : {})}
              className={top ? "" : "fill-foreground/55"}
            />
          </g>
        );
      })}
    </svg>
  );
}
