import { CAT, TXT, VIEWBOX } from "./lib";

const TILES = [
  {
    x: 8,
    y: 8,
    w: 92,
    h: 104,
    series: 0,
    opacity: 0.85,
    label: "node_modules",
    size: "2.1 GB",
  },
  {
    x: 102,
    y: 8,
    w: 56,
    h: 62,
    series: 1,
    opacity: 0.85,
    label: "src",
    size: "840 MB",
  },
  { x: 160, y: 8, w: 32, h: 62, series: 1, opacity: 0.55, label: "assets" },
  { x: 102, y: 72, w: 38, h: 40, series: 2, opacity: 0.85, label: "dist" },
  { x: 142, y: 72, w: 28, h: 40, series: 2, opacity: 0.55, label: ".git" },
  { x: 172, y: 72, w: 20, h: 40, series: 3, opacity: 0.8, label: "" },
];

export function TreemapChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {TILES.map((tile, i) => (
        <g key={i}>
          <rect
            x={tile.x}
            y={tile.y}
            width={tile.w}
            height={tile.h}
            rx="3"
            fill={CAT[tile.series]}
            opacity={tile.opacity}
          />
          {tile.label && (
            <text x={tile.x + 5} y={tile.y + 9} {...TXT.onSeries}>
              {tile.label}
            </text>
          )}
          {tile.size && (
            <text
              x={tile.x + 5}
              y={tile.y + 16.5}
              {...TXT.onSeries}
              opacity="0.7"
            >
              {tile.size}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
