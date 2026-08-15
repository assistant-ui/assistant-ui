import { BLUE, TXT, VIEWBOX, seqOpacity } from "./lib";

const COLS = 16;
const ROWS = 7;
const DAY_LABELS = [
  { label: "Mon", row: 0 },
  { label: "Wed", row: 2 },
  { label: "Fri", row: 4 },
];

export function CalendarHeatmapChart() {
  const cells = [];
  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS; r += 1) {
      const v =
        (Math.sin(c * 1.7 + r * 0.9) + Math.sin(c * 0.6 - r * 1.3) + 2) / 4;
      cells.push({ c, r, v });
    }
  }
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {DAY_LABELS.map((d) => (
        <text key={d.label} x="8" y={26 + d.row * 10 + 6} {...TXT.axis}>
          {d.label}
        </text>
      ))}
      {["May", "Jun", "Jul", "Aug"].map((m, i) => (
        <text key={m} x={30 + i * 40} y="106" {...TXT.axis}>
          {m}
        </text>
      ))}
      {cells.map(({ c, r, v }) => {
        const x = 30 + c * 10;
        const y = 26 + r * 10;
        if (v < 0.22) {
          return (
            <rect
              key={`${c}-${r}`}
              x={x}
              y={y}
              width="7.6"
              height="7.6"
              rx="2"
              className="fill-foreground/8"
            />
          );
        }
        return (
          <rect
            key={`${c}-${r}`}
            x={x}
            y={y}
            width="7.6"
            height="7.6"
            rx="2"
            fill={BLUE}
            opacity={seqOpacity(v)}
          />
        );
      })}
    </svg>
  );
}
