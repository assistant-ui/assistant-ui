import { BLUE, VIEWBOX, barPath } from "./lib";

const ROWS = [
  { label: "down / up", share: 0.72 },
  { label: "read / write", share: 0.55 },
  { label: "hit / miss", share: 0.86 },
];

export function SplitBarChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {ROWS.map((row, i) => {
        const y = 22 + i * 30;
        const w = 170 * row.share;
        return (
          <g key={row.label}>
            <text
              x="15"
              y={y - 4}
              fontSize="6"
              className="fill-foreground/45 font-mono"
            >
              {row.label}
            </text>
            <path
              d={barPath(15, y, w - 1, 8, 4, "left")}
              fill={BLUE}
              opacity="0.85"
            />
            <path
              d={barPath(15 + w + 1, y, 170 - w - 1, 8, 4, "right")}
              className="fill-foreground/20"
            />
          </g>
        );
      })}
    </svg>
  );
}
