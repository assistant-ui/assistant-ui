import { CAT, Legend, TXT, VIEWBOX } from "./lib";

const YEARS = ["21", "22", "23", "24", "25"];
const DEVICES = ["mobile", "desktop", "tablet"];
const COLUMNS = [
  [44, 42, 14],
  [50, 38, 12],
  [56, 34, 10],
  [61, 31, 8],
  [66, 28, 6],
];

export function PercentStackedBarChart() {
  const height = 78;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <Legend
        x={22}
        y={12}
        items={DEVICES.map((d, k) => ({ label: d, fill: CAT[k] }))}
      />
      {COLUMNS.map((column, c) => {
        const total = column.reduce((sum, v) => sum + v, 0);
        let cursor = 100;
        return (
          <g key={c}>
            {column.map((v, k) => {
              const h = (v / total) * height - (k === 0 ? 0 : 1.6);
              const y = cursor - h;
              cursor = y - 1.6;
              return (
                <rect
                  key={k}
                  x={22 + c * 33}
                  y={y}
                  width="21"
                  height={h}
                  rx="2"
                  fill={CAT[k]}
                  opacity="0.9"
                />
              );
            })}
            <text x={32.5 + c * 33} y="112" textAnchor="middle" {...TXT.axis}>
              &apos;{YEARS[c]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
