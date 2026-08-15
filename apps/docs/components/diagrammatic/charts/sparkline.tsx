import { BLUE, VIEWBOX, linePath, scale, stroke } from "./lib";

const ROWS = [
  { label: "cpu", data: [40, 55, 48, 62, 58, 74, 70, 86], value: "86%" },
  { label: "mem", data: [62, 60, 66, 64, 70, 68, 72, 71], value: "71%" },
  { label: "req", data: [30, 44, 38, 30, 46, 40, 58, 52], value: "52/s" },
];

export function SparklineChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {ROWS.map((row, i) => {
        const y = 20 + i * 32;
        const pts = scale(row.data, 52, 148, y + 9, y - 9, 0, 100);
        const last = pts[pts.length - 1]!;
        return (
          <g key={row.label}>
            <text
              x="16"
              y={y + 2.2}
              fontSize="6.5"
              className="fill-foreground/55 font-mono"
            >
              {row.label}
            </text>
            <path
              d={linePath(pts)}
              fill="none"
              className="stroke-foreground/60"
              {...stroke.medium}
            />
            <circle cx={last.x} cy={last.y} r="2.2" fill={BLUE} />
            <text
              x="184"
              y={y + 2.2}
              fontSize="6.5"
              textAnchor="end"
              className="fill-foreground/80 font-mono"
            >
              {row.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
