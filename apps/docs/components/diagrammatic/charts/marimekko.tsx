import { CAT, TXT, VIEWBOX } from "./lib";

const VENDORS = ["north", "acme", "other"];
const COLUMNS = [
  { label: "AMER", width: 62, shares: [0.5, 0.3, 0.2] },
  { label: "EMEA", width: 48, shares: [0.35, 0.42, 0.23] },
  { label: "APAC", width: 40, shares: [0.55, 0.2, 0.25] },
  { label: "LATAM", width: 28, shares: [0.28, 0.5, 0.22] },
];

export function MarimekkoChart() {
  let x = 8;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {COLUMNS.map((column, c) => {
        const x0 = x;
        x += column.width + 2;
        let y = 8;
        return (
          <g key={column.label}>
            {column.shares.map((share, k) => {
              const h = share * 96 - 1.6;
              const y0 = y;
              y += share * 96;
              return (
                <g key={k}>
                  <rect
                    x={x0}
                    y={y0}
                    width={column.width}
                    height={h}
                    rx="2"
                    fill={CAT[k]}
                    opacity="0.88"
                  />
                  {c === 0 && (
                    <text x={x0 + 5} y={y0 + h / 2 + 1.8} {...TXT.onSeries}>
                      {VENDORS[k]}
                    </text>
                  )}
                </g>
              );
            })}
            <text
              x={x0 + column.width / 2}
              y="114"
              textAnchor="middle"
              {...TXT.axis}
            >
              {column.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
