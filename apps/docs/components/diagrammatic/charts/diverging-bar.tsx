import { NEG, POS, TXT, VIEWBOX, barPath, stroke } from "./lib";

const PRODUCTS = [
  { label: "cloud", value: 48 },
  { label: "search", value: 34 },
  { label: "mail", value: 26 },
  { label: "iot", value: 18 },
  { label: "maps", value: -12 },
  { label: "ads", value: -22 },
  { label: "video", value: -38 },
];

export function DivergingBarChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="104"
        y1="8"
        x2="104"
        y2="104"
        className="stroke-foreground/15"
        {...stroke.hair}
      />
      <text x="104" y="114" textAnchor="middle" {...TXT.axis}>
        0 = plan
      </text>
      {PRODUCTS.map((row, i) => {
        const y = 10 + i * 13.8;
        const w = Math.abs(row.value) * 1.6;
        return (
          <g key={row.label}>
            <text x="8" y={y + 8} {...TXT.axis}>
              {row.label}
            </text>
            {row.value >= 0 ? (
              <path
                d={barPath(105.5, y, w, 10, 2.5, "right")}
                fill={POS}
                opacity="0.85"
              />
            ) : (
              <path
                d={barPath(102.5 - w, y, w, 10, 2.5, "left")}
                fill={NEG}
                opacity="0.85"
              />
            )}
            <text
              x={row.value >= 0 ? 105.5 + w + 3.5 : 102.5 - w - 3.5}
              y={y + 8}
              textAnchor={row.value >= 0 ? "start" : "end"}
              {...TXT.axis}
            >
              {row.value > 0 ? `+${row.value}%` : `${row.value}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
