import { BLUE, TXT, VIEWBOX } from "./lib";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEIGHT = [0.45, 0.85, 1, 0.9, 0.75, 0.5, 0.3];
const COLS = 12;

export function PunchcardChart() {
  const dots = [];
  for (let r = 0; r < DAYS.length; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const day = WEIGHT[r]!;
      const hour = Math.max(0, Math.sin(((c + 0.5) / COLS) * Math.PI));
      const v = Math.max(
        0,
        Math.min(day * hour + 0.12 * Math.sin(c * 2.1 + r), 1),
      );
      dots.push({ r, c, v });
    }
  }
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {DAYS.map((d, r) => (
        <text key={d} x="8" y={16 + r * 13 + 1.8} {...TXT.axis}>
          {d}
        </text>
      ))}
      {["0h", "6h", "12h", "18h"].map((h, i) => (
        <text
          key={h}
          x={32 + i * 42.9}
          y="112"
          textAnchor="middle"
          {...TXT.axis}
        >
          {h}
        </text>
      ))}
      {dots.map(({ r, c, v }) => (
        <circle
          key={`${r}-${c}`}
          cx={32 + c * 14.3}
          cy={16 + r * 13}
          r={0.7 + v * 3.3}
          fill={BLUE}
          opacity={0.25 + 0.6 * v}
        />
      ))}
    </svg>
  );
}
