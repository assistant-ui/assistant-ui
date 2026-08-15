import { BLUE, VIEWBOX, barPath, stroke } from "./lib";

const ROWS = [
  { label: "rev", bands: [60, 110, 160], value: 128, target: 140 },
  { label: "nps", bands: [50, 95, 160], value: 104, target: 90 },
];

export function BulletChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {ROWS.map((row, i) => {
        const y = 32 + i * 46;
        return (
          <g key={row.label}>
            <text
              x="16"
              y={y + 8.4}
              fontSize="6.5"
              className="fill-foreground/55 font-mono"
            >
              {row.label}
            </text>
            {row.bands.map((w, k) => (
              <rect
                key={k}
                x="42"
                y={y}
                width={w}
                height="13"
                rx="3"
                className={
                  [
                    "fill-foreground/14",
                    "fill-foreground/9",
                    "fill-foreground/5",
                  ][k]
                }
              />
            ))}
            <path
              d={barPath(42, y + 4, row.value, 5, 2.5, "right")}
              className="fill-foreground/80"
            />
            <line
              x1={42 + row.target}
              y1={y - 2.5}
              x2={42 + row.target}
              y2={y + 15.5}
              stroke={BLUE}
              {...stroke.line}
            />
          </g>
        );
      })}
    </svg>
  );
}
