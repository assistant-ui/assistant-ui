import { CAT, TXT, VIEWBOX, polar, ring, round } from "./lib";

const TAU = Math.PI * 2;
const CX = 100;
const CY = 60;
const R = 38;

function ribbon(a0: number, a1: number, b0: number, b1: number): string {
  const p = (f: number) => polar(CX, CY, R, f * TAU - Math.PI / 2);
  const s0 = p(a0);
  const s1 = p(a1);
  const t0 = p(b0);
  const t1 = p(b1);
  return [
    `M${round(s0.x)} ${round(s0.y)}`,
    `A${R} ${R} 0 0 1 ${round(s1.x)} ${round(s1.y)}`,
    `Q${CX} ${CY} ${round(t0.x)} ${round(t0.y)}`,
    `A${R} ${R} 0 0 1 ${round(t1.x)} ${round(t1.y)}`,
    `Q${CX} ${CY} ${round(s0.x)} ${round(s0.y)}`,
    "Z",
  ].join(" ");
}

const REGIONS = [
  { from: 0, to: 0.3, series: 0, label: "americas" },
  { from: 0.32, to: 0.55, series: 1, label: "europe" },
  { from: 0.57, to: 0.78, series: 2, label: "asia" },
  { from: 0.8, to: 0.98, series: 3, label: "africa" },
];

const RIBBONS = [
  { d: ribbon(0.02, 0.14, 0.6, 0.7), series: 0, opacity: 0.28 },
  { d: ribbon(0.16, 0.28, 0.34, 0.42), series: 0, opacity: 0.16 },
  { d: ribbon(0.44, 0.54, 0.82, 0.9), series: 1, opacity: 0.25 },
  { d: ribbon(0.72, 0.77, 0.92, 0.97), series: 2, opacity: 0.25 },
];

export function ChordChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {RIBBONS.map((r, i) => (
        <path key={i} d={r.d} fill={CAT[r.series]} opacity={r.opacity} />
      ))}
      {REGIONS.map((g) => (
        <path
          key={g.label}
          d={ring(CX, CY, 40, 47, g.from * TAU, g.to * TAU)}
          fill={CAT[g.series]}
          opacity="0.9"
        />
      ))}
      {REGIONS.map((g) => {
        const mid = ((g.from + g.to) / 2) * TAU - Math.PI / 2;
        const p = polar(CX, CY, 54, mid);
        const side = Math.cos(mid);
        return (
          <text
            key={g.label}
            x={round(p.x)}
            y={round(p.y) + 1.8}
            textAnchor={side > 0.35 ? "start" : side < -0.35 ? "end" : "middle"}
            {...TXT.axis}
          >
            {g.label}
          </text>
        );
      })}
    </svg>
  );
}
