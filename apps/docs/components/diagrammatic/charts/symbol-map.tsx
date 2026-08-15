import { BLUE, TXT, VIEWBOX, stroke } from "./lib";
import { TILE, TILES, tileAt, tileCenter } from "./map-tiles";

const POPS = [
  { col: 4, row: 1, r: 9, label: "west-1" },
  { col: 7, row: 3, r: 6.5 },
  { col: 3, row: 4, r: 4.5 },
  { col: 13, row: 2, r: 5.5, label: "east-2" },
  { col: 14, row: 3, r: 3.5 },
  { col: 5, row: 6, r: 3.5 },
  { col: 11, row: 6, r: 2.8 },
];

export function SymbolMapChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {TILES.map((tile) => (
        <rect
          key={`${tile.col}-${tile.row}`}
          x={tile.x}
          y={tile.y}
          width={TILE}
          height="10.8"
          rx="2.5"
          className="fill-foreground/8"
        />
      ))}
      {POPS.map((pop, i) => {
        const tile = tileAt(pop.col, pop.row);
        if (!tile) return null;
        const c = tileCenter(tile);
        return (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={pop.r}
              fill={BLUE}
              fillOpacity="0.3"
              stroke={BLUE}
              strokeOpacity="0.8"
              {...stroke.medium}
            />
            {pop.label && (
              <text
                x={c.x}
                y={c.y - pop.r - 3}
                textAnchor="middle"
                {...TXT.axis}
              >
                {pop.label}
              </text>
            )}
          </g>
        );
      })}
      <text x="192" y="113" textAnchor="end" {...TXT.axis}>
        circle = capacity
      </text>
    </svg>
  );
}
