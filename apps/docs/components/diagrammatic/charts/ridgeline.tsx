import { BLUE, TXT, VIEWBOX, linePath, scale } from "./lib";

const MONTHS = [
  { label: "Jan", bins: [2, 8, 22, 40, 30, 14, 6, 3, 2, 1] },
  { label: "Feb", bins: [1, 4, 12, 30, 44, 28, 12, 5, 2, 1] },
  { label: "Mar", bins: [1, 3, 8, 18, 34, 46, 30, 14, 5, 2] },
  { label: "Apr", bins: [1, 2, 5, 12, 24, 38, 44, 26, 10, 3] },
  { label: "May", bins: [1, 1, 3, 8, 16, 28, 40, 36, 18, 6] },
];

export function RidgelineChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {MONTHS.map((row, i) => {
        const baseline = 36 + i * 17.5;
        const pts = scale(row.bins, 34, 190, baseline, baseline - 30, 0, 50);
        const accent = i === 2;
        return (
          <g key={row.label}>
            <path
              d={`${linePath(pts)} L190 ${baseline} L34 ${baseline} Z`}
              className={
                accent
                  ? "fill-background dark:fill-popover"
                  : "fill-background stroke-foreground/40 dark:fill-popover"
              }
              {...(accent ? { stroke: BLUE } : {})}
              strokeWidth={accent ? 1.5 : 1}
              vectorEffect="non-scaling-stroke"
            />
            <text x="8" y={baseline + 1} {...TXT.axis}>
              {row.label}
            </text>
          </g>
        );
      })}
      {["-10°", "0°", "10°", "20°"].map((t, i) => (
        <text key={t} x={44 + i * 45} y="114" textAnchor="middle" {...TXT.axis}>
          {t}
        </text>
      ))}
    </svg>
  );
}
