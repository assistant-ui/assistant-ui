import { CAT, TXT, VIEWBOX, linePath, stroke } from "./lib";

const YEARS = ["2021", "2022", "2023", "2024", "2025"];
const STAGES = [22, 57, 92, 127, 162];
const FRAMEWORKS = [
  { name: "react", ranks: [2, 1, 1, 2, 1] },
  { name: "jquery", ranks: [1, 2, 3, 3, 3] },
  { name: "vue", ranks: [3, 3, 2, 1, 2] },
  { name: "angular", ranks: [4, 4, 4, 4, 4] },
];

const Y = (rank: number) => 6 + rank * 19;

export function BumpChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {FRAMEWORKS.map((series, k) => {
        const pts = series.ranks.map((rank, i) => ({
          x: STAGES[i]!,
          y: Y(rank),
        }));
        const last = pts[pts.length - 1]!;
        return (
          <g key={series.name}>
            <path
              d={linePath(pts)}
              fill="none"
              stroke={CAT[k]}
              opacity="0.85"
              {...stroke.line}
            />
            {pts.map((p) => (
              <circle key={p.x} cx={p.x} cy={p.y} r="2.4" fill={CAT[k]} />
            ))}
            <text
              x={last.x + 6}
              y={last.y + 1.6}
              fontSize="4.5"
              fill={CAT[k]}
              className="font-mono"
            >
              {series.name}
            </text>
          </g>
        );
      })}
      {YEARS.map((year, i) => (
        <text
          key={year}
          x={STAGES[i]!}
          y="112"
          textAnchor="middle"
          {...TXT.axis}
        >
          {year}
        </text>
      ))}
    </svg>
  );
}
