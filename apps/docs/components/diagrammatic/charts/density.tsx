import { BLUE, TXT, VIEWBOX, areaPath, linePath, scale, stroke } from "./lib";

const SHAPE = [2, 6, 14, 30, 52, 74, 88, 92, 80, 60, 46, 38, 30, 20, 10, 4];
const TICKS = [
  { x: 34, label: "2:30" },
  { x: 82, label: "3:30" },
  { x: 130, label: "4:30" },
  { x: 178, label: "5:30" },
];

export function DensityChart() {
  const pts = scale(SHAPE, 10, 190, 100, 18, 0, 100);
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
      <path d={areaPath(pts, 100)} className="fill-foreground/10" />
      <path
        d={linePath(pts)}
        fill="none"
        className="stroke-foreground/70"
        {...stroke.line}
      />
      <line
        x1="90"
        y1="18"
        x2="90"
        y2="100"
        stroke={BLUE}
        strokeDasharray="3 3"
        {...stroke.hair}
      />
      <text x="94" y="18" fontSize="4.5" fill={BLUE} className="font-mono">
        median 3:58
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
