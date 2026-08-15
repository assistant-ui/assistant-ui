import { BLUE, VIEWBOX, polar, round } from "./lib";

const VALUE = 0.68;

function arc(value: number, r: number): string {
  const a0 = -Math.PI;
  const a1 = a0 + value * Math.PI;
  const start = polar(100, 92, r, a0);
  const end = polar(100, 92, r, a1);
  return `M${round(start.x)} ${round(start.y)} A${r} ${r} 0 0 1 ${round(end.x)} ${round(end.y)}`;
}

export function GaugeChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <path
        d={arc(1, 54)}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        className="stroke-foreground/8"
      />
      <path
        d={arc(VALUE, 54)}
        fill="none"
        stroke={BLUE}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <text
        x="100"
        y="82"
        fontSize="17"
        textAnchor="middle"
        className="fill-foreground/85 font-mono"
      >
        68%
      </text>
      <text
        x="100"
        y="92"
        textAnchor="middle"
        fontSize="4.5"
        className="fill-foreground/40 font-mono"
      >
        error budget used
      </text>
      <text
        x="42"
        y="106"
        fontSize="6"
        textAnchor="middle"
        className="fill-foreground/35 font-mono"
      >
        0
      </text>
      <text
        x="158"
        y="106"
        fontSize="6"
        textAnchor="middle"
        className="fill-foreground/35 font-mono"
      >
        100
      </text>
    </svg>
  );
}
