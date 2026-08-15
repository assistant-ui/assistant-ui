import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const DOTS: Array<[number, number]> = [
  [22, 88],
  [30, 92],
  [34, 78],
  [40, 84],
  [46, 70],
  [50, 78],
  [56, 62],
  [60, 72],
  [66, 58],
  [72, 64],
  [76, 50],
  [82, 58],
  [88, 44],
  [92, 52],
  [98, 40],
  [104, 46],
  [110, 34],
  [116, 42],
  [122, 28],
  [128, 36],
  [136, 24],
  [142, 32],
  [150, 20],
  [158, 26],
  [166, 16],
  [174, 22],
];

export function ScatterChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="14"
        y1="102"
        x2="186"
        y2="102"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      <line
        x1="14"
        y1="102"
        x2="14"
        y2="10"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      <line
        x1="20"
        y1="92"
        x2="180"
        y2="14"
        stroke={BLUE}
        strokeDasharray="4 4"
        opacity="0.7"
        {...stroke.hair}
      />
      {DOTS.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y - 4}
          r="3"
          className="fill-foreground/50"
        />
      ))}
      <text x="19" y="16" {...TXT.axis}>
        rating ↑
      </text>
      <text x="186" y="112" textAnchor="end" {...TXT.axis}>
        hours of use →
      </text>
    </svg>
  );
}
