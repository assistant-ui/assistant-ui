import { BLUE, TXT, VIEWBOX, barPath, stroke } from "./lib";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "Q1", "Q2", "Q3"];
const REVENUE = [38, 52, 44, 66, 58, 74, 90];

export function ColumnChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="10"
        y1="100"
        x2="190"
        y2="100"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      {REVENUE.map((v, i) => {
        const x = 16 + i * 25;
        const h = v * 0.86;
        const current = i === REVENUE.length - 1;
        return (
          <g key={i}>
            <path
              d={barPath(x, 100 - h, 15, h, 3, "top")}
              {...(current ? { fill: BLUE } : {})}
              className={current ? "" : "fill-foreground/30"}
            />
            {current && (
              <text
                x={x + 7.5}
                y={100 - h - 4}
                textAnchor="middle"
                {...TXT.value}
              >
                $9.0m
              </text>
            )}
            <text x={x + 7.5} y="112" textAnchor="middle" {...TXT.axis}>
              {QUARTERS[i]}
            </text>
          </g>
        );
      })}
      <text x="16" y="118" {...TXT.axis}>
        2024
      </text>
      <text x="116" y="118" {...TXT.axis}>
        2025
      </text>
    </svg>
  );
}
