import { CAT, TXT, VIEWBOX, ring } from "./lib";

const BROWSERS = [
  { label: "chrome", share: 0.42 },
  { label: "safari", share: 0.27 },
  { label: "edge", share: 0.19 },
  { label: "other", share: 0.12 },
];

export function PieChart() {
  const gap = 0.03;
  let angle = 0;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {BROWSERS.map((slice, i) => {
        const a0 = angle + gap;
        angle += slice.share * Math.PI * 2;
        return (
          <path
            key={slice.label}
            d={ring(64, 60, 0.001, 44, a0, angle - gap)}
            fill={CAT[i]}
            opacity="0.9"
          />
        );
      })}
      {BROWSERS.map((slice, i) => (
        <g key={slice.label}>
          <circle cx="126" cy={38 + i * 15} r="2.4" fill={CAT[i]} />
          <text x="132" y={38 + i * 15 + 1.8} {...TXT.label}>
            {slice.label}
          </text>
          <text x="186" y={38 + i * 15 + 1.8} textAnchor="end" {...TXT.value}>
            {Math.round(slice.share * 100)}%
          </text>
        </g>
      ))}
    </svg>
  );
}
