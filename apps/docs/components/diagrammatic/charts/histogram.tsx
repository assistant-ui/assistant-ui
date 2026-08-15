import { BLUE, TXT, VIEWBOX, barPath, stroke } from "./lib";

const BINS = [6, 12, 22, 38, 58, 78, 92, 84, 66, 46, 30, 18, 10, 5];
const TICKS = [
  { x: 12, label: "0" },
  { x: 56, label: "200ms" },
  { x: 100, label: "400ms" },
  { x: 144, label: "600ms" },
  { x: 188, label: "800ms" },
];

export function HistogramChart() {
  const width = 176 / BINS.length;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="10"
        y1="100"
        x2="190"
        y2="100"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      {BINS.map((v, i) => (
        <path
          key={i}
          d={barPath(
            12 + i * width,
            100 - v * 0.86,
            width - 1.4,
            v * 0.86,
            2,
            "top",
          )}
          className="fill-foreground/35"
        />
      ))}
      <line
        x1="98.5"
        y1="14"
        x2="98.5"
        y2="100"
        stroke={BLUE}
        strokeDasharray="3 3"
        {...stroke.hair}
      />
      <text x="102" y="14" fontSize="4.5" fill={BLUE} className="font-mono">
        median 392ms
      </text>
      {TICKS.map((tick) => (
        <text
          key={tick.label}
          x={tick.x}
          y="112"
          textAnchor="middle"
          {...TXT.axis}
        >
          {tick.label}
        </text>
      ))}
    </svg>
  );
}
