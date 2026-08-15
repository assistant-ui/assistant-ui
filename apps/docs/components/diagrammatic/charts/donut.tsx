import { CAT, TXT, VIEWBOX, ring } from "./lib";

const STORAGE = [
  { label: "photos", share: 0.38 },
  { label: "video", share: 0.28 },
  { label: "docs", share: 0.21 },
  { label: "other", share: 0.13 },
];

export function DonutChart() {
  const gap = 0.045;
  let angle = 0;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {STORAGE.map((slice, i) => {
        const a0 = angle + gap;
        angle += slice.share * Math.PI * 2;
        return (
          <path
            key={slice.label}
            d={ring(64, 60, 28, 44, a0, angle - gap)}
            fill={CAT[i]}
            opacity="0.9"
          />
        );
      })}
      <text
        x="64"
        y="58"
        textAnchor="middle"
        fontSize="10"
        className="fill-foreground/85 font-mono"
      >
        128
      </text>
      <text x="64" y="68" textAnchor="middle" {...TXT.axis}>
        GB used
      </text>
      {STORAGE.map((slice, i) => (
        <g key={slice.label}>
          <circle cx="126" cy={38 + i * 15} r="2.4" fill={CAT[i]} />
          <text x="132" y={38 + i * 15 + 1.8} {...TXT.label}>
            {slice.label}
          </text>
          <text x="186" y={38 + i * 15 + 1.8} textAnchor="end" {...TXT.value}>
            {Math.round(slice.share * 128)} GB
          </text>
        </g>
      ))}
    </svg>
  );
}
