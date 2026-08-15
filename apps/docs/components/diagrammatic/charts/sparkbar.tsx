import { BLUE, VIEWBOX } from "./lib";

const ROWS = [
  { label: "mon", data: [3, 5, 4, 7, 6, 9, 8, 10, 7, 6, 8, 9], value: "82" },
  { label: "tue", data: [5, 4, 6, 5, 8, 7, 9, 8, 10, 9, 7, 8], value: "86" },
  { label: "wed", data: [2, 3, 5, 4, 6, 5, 7, 9, 8, 10, 9, 11], value: "79" },
];

export function SparkbarChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {ROWS.map((row, i) => {
        const y = 20 + i * 32;
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
            {row.data.map((v, k) => {
              const h = v * 2;
              const peak = v === Math.max(...row.data);
              return (
                <rect
                  key={k}
                  x={52 + k * 8.2}
                  y={y + 11 - h}
                  width="5.4"
                  height={h}
                  rx="1.5"
                  {...(peak ? { fill: BLUE } : {})}
                  className={peak ? "" : "fill-foreground/35"}
                />
              );
            })}
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
