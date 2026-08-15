import { CAT, TXT, VIEWBOX, polar, ring, round } from "./lib";

const TAU = Math.PI * 2;
const DEPARTMENTS = [
  { share: 0.45, series: 0, label: "eng" },
  { share: 0.33, series: 1, label: "gtm" },
  { share: 0.22, series: 2, label: "ops" },
];
const TEAMS = [
  { share: 0.26, series: 0, opacity: 0.85 },
  { share: 0.19, series: 0, opacity: 0.5 },
  { share: 0.18, series: 1, opacity: 0.85 },
  { share: 0.15, series: 1, opacity: 0.5 },
  { share: 0.13, series: 2, opacity: 0.85 },
  { share: 0.09, series: 2, opacity: 0.5 },
];

export function SunburstChart() {
  const gap = 0.04;
  let a = 0;
  let b = 0;
  let labelAngle = 0;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {DEPARTMENTS.map((seg, i) => {
        const a0 = a + gap;
        a += seg.share * TAU;
        return (
          <path
            key={i}
            d={ring(100, 60, 13, 31, a0, a - gap)}
            fill={CAT[seg.series]}
            opacity="0.9"
          />
        );
      })}
      {TEAMS.map((seg, i) => {
        const b0 = b + gap;
        b += seg.share * TAU;
        return (
          <path
            key={i}
            d={ring(100, 60, 34, 48, b0, b - gap)}
            fill={CAT[seg.series]}
            opacity={seg.opacity}
          />
        );
      })}
      {DEPARTMENTS.map((seg) => {
        const mid = labelAngle + (seg.share * TAU) / 2 - Math.PI / 2;
        labelAngle += seg.share * TAU;
        const p = polar(100, 60, 22, mid);
        return (
          <text
            key={seg.label}
            x={round(p.x)}
            y={round(p.y) + 1.6}
            textAnchor="middle"
            {...TXT.onSeries}
          >
            {seg.label}
          </text>
        );
      })}
    </svg>
  );
}
