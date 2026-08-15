import { CAT, Legend, TXT, VIEWBOX, barPath, stroke } from "./lib";

const MONTHS = ["Jan", "Feb", "Mar", "Apr"];
const SERVICES = ["compute", "storage", "egress"];
const COLUMNS = [
  [26, 19, 12],
  [33, 22, 17],
  [22, 15, 10],
  [38, 26, 14],
];

export function StackedBarChart() {
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
      <Legend
        x={14}
        y={12}
        items={SERVICES.map((s, k) => ({ label: s, fill: CAT[k] }))}
      />
      {COLUMNS.map((column, c) => {
        let cursor = 100;
        return (
          <g key={c}>
            {column.map((v, k) => {
              const gap = k === 0 ? 0 : 1.6;
              const y = cursor - v;
              const segment =
                k === column.length - 1 ? (
                  <path
                    key={k}
                    d={barPath(28 + c * 40, y - gap, 20, v, 3, "top")}
                    fill={CAT[k]}
                    opacity="0.9"
                  />
                ) : (
                  <rect
                    key={k}
                    x={28 + c * 40}
                    y={y - gap}
                    width="20"
                    height={v}
                    fill={CAT[k]}
                    opacity="0.9"
                  />
                );
              cursor = y - gap;
              return segment;
            })}
            <text x={38 + c * 40} y="112" textAnchor="middle" {...TXT.axis}>
              {MONTHS[c]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
