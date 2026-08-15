import { CAT, TXT, VIEWBOX } from "./lib";

const LEVEL2 = [
  { x: 8, w: 84, series: 0, label: "packages" },
  { x: 94, w: 58, series: 1, label: "apps" },
  { x: 154, w: 38, series: 2, label: "docs" },
];
const LEVEL3 = [
  { x: 8, w: 50, series: 0, opacity: 0.55, label: "react" },
  { x: 60, w: 32, series: 0, opacity: 0.35, label: "core" },
  { x: 94, w: 34, series: 1, opacity: 0.55, label: "web" },
  { x: 130, w: 22, series: 1, opacity: 0.35, label: "" },
  { x: 154, w: 24, series: 2, opacity: 0.55, label: "" },
  { x: 180, w: 12, series: 2, opacity: 0.35, label: "" },
];

export function IcicleChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <rect
        x="8"
        y="12"
        width="184"
        height="28"
        rx="3"
        className="fill-foreground/15"
      />
      <text x="14" y="28.5" {...TXT.label}>
        repo · 4.2 GB
      </text>
      {LEVEL2.map((seg, i) => (
        <g key={i}>
          <rect
            x={seg.x}
            y="42"
            width={seg.w}
            height="28"
            rx="3"
            fill={CAT[seg.series]}
            opacity="0.85"
          />
          <text x={seg.x + 5} y="58.5" {...TXT.onSeries}>
            {seg.label}
          </text>
        </g>
      ))}
      {LEVEL3.map((seg, i) => (
        <g key={i}>
          <rect
            x={seg.x}
            y="72"
            width={seg.w}
            height="28"
            rx="3"
            fill={CAT[seg.series]}
            opacity={seg.opacity}
          />
          {seg.label && (
            <text x={seg.x + 5} y="88.5" {...TXT.onSeries}>
              {seg.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
