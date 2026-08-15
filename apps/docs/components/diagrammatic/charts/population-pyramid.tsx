import { CAT, Legend, TXT, VIEWBOX, barPath } from "./lib";

const BANDS = [
  { label: "70+", left: 22, right: 28 },
  { label: "60s", left: 38, right: 42 },
  { label: "50s", left: 56, right: 58 },
  { label: "40s", left: 68, right: 64 },
  { label: "30s", left: 76, right: 70 },
  { label: "20s", left: 60, right: 56 },
  { label: "10s", left: 42, right: 40 },
  { label: "0-9", left: 22, right: 24 },
];

export function PopulationPyramidChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <Legend
        x={100}
        y={11}
        anchor="end"
        items={[
          { label: "men", fill: CAT[0] },
          { label: "women", fill: CAT[2] },
        ]}
      />
      {BANDS.map((band, i) => {
        const y = 17 + i * 11.6;
        return (
          <g key={band.label}>
            <path
              d={barPath(90 - band.left, y, band.left, 8.4, 2.5, "left")}
              fill={CAT[0]}
              opacity="0.85"
            />
            <path
              d={barPath(110, y, band.right, 8.4, 2.5, "right")}
              fill={CAT[2]}
              opacity="0.85"
            />
            <text x="100" y={y + 6.4} textAnchor="middle" {...TXT.axis}>
              {band.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
