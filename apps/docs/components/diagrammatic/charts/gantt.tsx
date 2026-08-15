import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const ROWS = [
  { label: "design", from: 46, to: 92, kind: "done" },
  { label: "api", from: 82, to: 132, kind: "done" },
  { label: "frontend", from: 118, to: 186, kind: "active" },
  { label: "qa", from: 58, to: 108, kind: "done" },
  { label: "beta", from: 104, to: 160, kind: "planned" },
  { label: "launch", from: 152, to: 190, kind: "planned" },
] as const;

const MONTHS = [
  { label: "Apr", x: 46 },
  { label: "May", x: 94 },
  { label: "Jun", x: 142 },
  { label: "Jul", x: 190 },
];

export function GanttChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {ROWS.map((row, i) => {
        const y = 15 + i * 15;
        return (
          <g key={row.label}>
            <text x="8" y={y + 6.4} {...TXT.axis}>
              {row.label}
            </text>
            {row.kind === "planned" ? (
              <rect
                x={row.from}
                y={y}
                width={row.to - row.from}
                height="8"
                rx="4"
                fill={BLUE}
                opacity="0.18"
                stroke={BLUE}
                strokeOpacity="0.5"
                {...stroke.hair}
              />
            ) : (
              <rect
                x={row.from}
                y={y}
                width={row.to - row.from}
                height="8"
                rx="4"
                {...(row.kind === "active" ? { fill: BLUE } : {})}
                className={row.kind === "active" ? "" : "fill-foreground/25"}
              />
            )}
          </g>
        );
      })}
      <line
        x1="138"
        y1="10"
        x2="138"
        y2="104"
        stroke={BLUE}
        strokeDasharray="3 3"
        {...stroke.hair}
      />
      <text
        x="138"
        y="8"
        textAnchor="middle"
        fontSize="4.5"
        fill={BLUE}
        className="font-mono"
      >
        today
      </text>
      {MONTHS.map((m) => (
        <text key={m.label} x={m.x} y="114" textAnchor="middle" {...TXT.axis}>
          {m.label}
        </text>
      ))}
    </svg>
  );
}
