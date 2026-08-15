import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const SUITES = [
  { label: "unit", xs: [28, 40, 46, 54, 58, 66, 72, 80, 92, 108], mean: 62 },
  { label: "int", xs: [44, 56, 64, 70, 76, 82, 88, 96, 110, 126], mean: 80 },
  {
    label: "e2e",
    xs: [60, 76, 88, 96, 104, 112, 120, 132, 148, 160],
    mean: 106,
  },
];

export function StripPlotChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {SUITES.map((row, i) => {
        const y = 22 + i * 31;
        return (
          <g key={row.label}>
            <text x="8" y={y + 1.8} {...TXT.axis}>
              {row.label}
            </text>
            <line
              x1="26"
              y1={y}
              x2="186"
              y2={y}
              className="stroke-foreground/8"
              {...stroke.hair}
            />
            {row.xs.map((x, k) => (
              <circle
                key={k}
                cx={x + 16 + ((k % 3) - 1) * 1.6}
                cy={y + ((k % 3) - 1) * 4}
                r="3"
                className="fill-foreground/40"
              />
            ))}
            <line
              x1={row.mean + 16}
              y1={y - 9}
              x2={row.mean + 16}
              y2={y + 9}
              stroke={BLUE}
              {...stroke.line}
            />
          </g>
        );
      })}
      {["0s", "2s", "4s", "6s"].map((t, i) => (
        <text key={t} x={42 + i * 45} y="116" textAnchor="middle" {...TXT.axis}>
          {t}
        </text>
      ))}
    </svg>
  );
}
