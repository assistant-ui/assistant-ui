import { BLUE, TXT, VIEWBOX, linePath, round } from "./lib";

const CATEGORIES = [
  { label: "apps", center: 46, widths: [1, 4, 9, 13, 10, 5, 2], median: 58 },
  { label: "games", center: 100, widths: [2, 6, 12, 15, 13, 8, 3], median: 52 },
  { label: "tools", center: 154, widths: [1, 3, 7, 11, 14, 9, 3], median: 44 },
];

export function ViolinChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {CATEGORIES.map((shape) => {
        const step = 84 / (shape.widths.length - 1);
        const right = shape.widths.map((w, i) => ({
          x: shape.center + w,
          y: 12 + i * step,
        }));
        const left = shape.widths
          .map((w, i) => ({ x: shape.center - w, y: 12 + i * step }))
          .reverse();
        const d = `${linePath(right)} L${linePath(left).slice(1)} Z`;
        return (
          <g key={shape.label}>
            <path
              d={d}
              className="fill-foreground/12 stroke-foreground/45"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={shape.center}
              cy={round(104 - shape.median)}
              r="2.6"
              fill={BLUE}
            />
            <text x={shape.center} y="114" textAnchor="middle" {...TXT.axis}>
              {shape.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
