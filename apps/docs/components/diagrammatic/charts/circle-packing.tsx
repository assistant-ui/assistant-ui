import { CAT, TXT, VIEWBOX, stroke } from "./lib";

const CLUSTERS = [
  {
    series: 0,
    label: "platform",
    circles: [
      { x: 72, y: 52, r: 20, named: true },
      { x: 96, y: 74, r: 12 },
      { x: 60, y: 82, r: 9 },
    ],
  },
  {
    series: 1,
    label: "growth",
    circles: [
      { x: 130, y: 46, r: 15, named: true },
      { x: 148, y: 70, r: 10 },
      { x: 118, y: 74, r: 6 },
    ],
  },
  {
    series: 2,
    label: "labs",
    circles: [
      { x: 96, y: 30, r: 8, named: true },
      { x: 116, y: 24, r: 5.5 },
    ],
  },
];

export function CirclePackingChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <circle
        cx="102"
        cy="58"
        r="52"
        fill="none"
        className="stroke-foreground/15"
        {...stroke.hair}
      />
      {CLUSTERS.map((cluster) =>
        cluster.circles.map((c, i) => (
          <g key={`${cluster.series}-${i}`}>
            <circle
              cx={c.x}
              cy={c.y}
              r={c.r}
              fill={CAT[cluster.series]}
              fillOpacity="0.25"
              stroke={CAT[cluster.series]}
              strokeOpacity="0.8"
              {...stroke.medium}
            />
            {c.named && (
              <text x={c.x} y={c.y + 1.6} textAnchor="middle" {...TXT.axis}>
                {cluster.label}
              </text>
            )}
          </g>
        )),
      )}
    </svg>
  );
}
