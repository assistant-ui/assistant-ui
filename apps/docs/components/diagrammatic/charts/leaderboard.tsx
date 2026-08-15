import { BLUE, VIEWBOX, barPath } from "./lib";

const REFERRERS = [
  { label: "google", value: 96, display: "9.6k" },
  { label: "github", value: 78, display: "7.8k" },
  { label: "x.com", value: 63, display: "6.3k" },
  { label: "reddit", value: 41, display: "4.1k" },
  { label: "hn", value: 28, display: "2.8k" },
];

export function LeaderboardChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {REFERRERS.map((row, i) => {
        const y = 12 + i * 21;
        const top = i === 0;
        return (
          <g key={row.label}>
            <text
              x="14"
              y={y + 6.2}
              fontSize="6"
              className="fill-foreground/60 font-mono"
            >
              {row.label}
            </text>
            <rect
              x="48"
              y={y}
              width="122"
              height="8.5"
              rx="4.25"
              className="fill-foreground/8"
            />
            <path
              d={barPath(48, y, row.value * 1.22, 8.5, 4.25, "right")}
              {...(top ? { fill: BLUE } : {})}
              className={top ? "" : "fill-foreground/40"}
            />
            <text
              x="186"
              y={y + 6.2}
              fontSize="6"
              textAnchor="end"
              className="fill-foreground/40 font-mono"
            >
              {row.display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
