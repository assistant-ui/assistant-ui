import { BLUE, TXT, VIEWBOX } from "./lib";

const OFFICES = [
  { label: "berlin", filled: 8.5, accent: true },
  { label: "tokyo", filled: 6, accent: false },
  { label: "austin", filled: 3.5, accent: false },
];

export function PictogramChart() {
  const units = 10;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {OFFICES.map((row, r) => {
        const y = 16 + r * 30;
        return (
          <g key={row.label}>
            <text x="8" y={y + 8.4} {...TXT.axis}>
              {row.label}
            </text>
            {Array.from({ length: units }, (_, c) => {
              const x = 40 + c * 15.4;
              const fill = row.filled - c;
              const key = `${row.label}-${c}`;
              if (fill >= 1) {
                return (
                  <rect
                    key={key}
                    x={x}
                    y={y}
                    width="12"
                    height="12"
                    rx="3.5"
                    {...(row.accent ? { fill: BLUE } : {})}
                    className={row.accent ? "" : "fill-foreground/55"}
                  />
                );
              }
              if (fill > 0) {
                return (
                  <g key={key}>
                    <rect
                      x={x}
                      y={y}
                      width="12"
                      height="12"
                      rx="3.5"
                      className="fill-foreground/10"
                    />
                    <path
                      d={`M${x} ${y + 3.5} A3.5 3.5 0 0 1 ${x + 3.5} ${y} H${x + 12 * fill} V${y + 12} H${x + 3.5} A3.5 3.5 0 0 1 ${x} ${y + 8.5} Z`}
                      {...(row.accent ? { fill: BLUE } : {})}
                      className={row.accent ? "" : "fill-foreground/55"}
                    />
                  </g>
                );
              }
              return (
                <rect
                  key={key}
                  x={x}
                  y={y}
                  width="12"
                  height="12"
                  rx="3.5"
                  className="fill-foreground/10"
                />
              );
            })}
          </g>
        );
      })}
      <text x="192" y="114" textAnchor="end" {...TXT.axis}>
        1 square = 10 people
      </text>
    </svg>
  );
}
