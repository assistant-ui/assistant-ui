import { NEG, POS, VIEWBOX, stroke } from "./lib";

const ROWS = [
  { label: "s24", results: [1, 1, -1, 1, -1, 1, 1, 1, -1, 1, 1, -1] },
  { label: "s25", results: [-1, 1, 1, -1, 1, -1, -1, 1, 1, 1, -1, 1] },
];

export function WinLossChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {ROWS.map((row, i) => {
        const mid = 38 + i * 48;
        return (
          <g key={row.label}>
            <text
              x="16"
              y={mid + 2.2}
              fontSize="6.5"
              className="fill-foreground/55 font-mono"
            >
              {row.label}
            </text>
            <line
              x1="50"
              y1={mid}
              x2="186"
              y2={mid}
              className="stroke-foreground/12"
              {...stroke.hair}
            />
            {row.results.map((r, k) => (
              <rect
                key={k}
                x={54 + k * 11}
                y={r > 0 ? mid - 13 : mid + 1.5}
                width="7"
                height="11.5"
                rx="2"
                fill={r > 0 ? POS : NEG}
                opacity={r > 0 ? 0.85 : 0.7}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
