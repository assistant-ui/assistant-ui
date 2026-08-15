import { BLUE, TXT, VIEWBOX, barPath, stroke } from "./lib";

const PACKAGES = [
  { label: "react", value: 25, display: "25m" },
  { label: "vue", value: 12, display: "12m" },
  { label: "svelte", value: 6.2, display: "6.2m" },
  { label: "solid", value: 2.1, display: "2.1m" },
  { label: "qwik", value: 0.9, display: "0.9m" },
];

export function BarChart() {
  const max = PACKAGES[0]!.value;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="44"
        y1="10"
        x2="44"
        y2="110"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      {PACKAGES.map((row, i) => {
        const y = 14 + i * 19.5;
        const w = Math.max((row.value / max) * 138, 3);
        return (
          <g key={row.label}>
            <text x="40" y={y + 8.2} textAnchor="end" {...TXT.label}>
              {row.label}
            </text>
            <path
              d={barPath(44, y, w, 11, 2.5, "right")}
              {...(i === 0 ? { fill: BLUE } : {})}
              className={i === 0 ? "" : "fill-foreground/30"}
            />
            <text x={44 + w + 4} y={y + 8.2} {...TXT.axis}>
              {row.display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
