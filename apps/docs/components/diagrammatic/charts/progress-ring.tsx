import { BLUE, VIEWBOX, polar, round } from "./lib";

const RINGS = [
  { value: 0.82, label: "82", name: "ship" },
  { value: 0.55, label: "55", name: "docs" },
  { value: 0.3, label: "30", name: "hire" },
];

function arc(cx: number, value: number): string {
  const r = 21;
  const a0 = -Math.PI / 2;
  const a1 = a0 + value * Math.PI * 2;
  const start = polar(cx, 60, r, a0);
  const end = polar(cx, 60, r, a1);
  return `M${round(start.x)} ${round(start.y)} A${r} ${r} 0 ${value > 0.5 ? 1 : 0} 1 ${round(end.x)} ${round(end.y)}`;
}

export function ProgressRingChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {RINGS.map((ringSpec, i) => {
        const cx = 44 + i * 56;
        return (
          <g key={i}>
            <circle
              cx={cx}
              cy="60"
              r="21"
              fill="none"
              strokeWidth="6"
              className="stroke-foreground/8"
            />
            <path
              d={arc(cx, ringSpec.value)}
              fill="none"
              stroke={BLUE}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <text
              x={cx}
              y="63"
              fontSize="9"
              textAnchor="middle"
              className="fill-foreground/80 font-mono"
            >
              {ringSpec.label}
            </text>
            <text
              x={cx}
              y="94"
              textAnchor="middle"
              fontSize="4.5"
              className="fill-foreground/40 font-mono"
            >
              {ringSpec.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
