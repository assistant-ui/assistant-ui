import { BLUE, TXT, VIEWBOX } from "./lib";
import { TILE, TILES, tileAt, tileCenter } from "./map-tiles";

const ORIGIN = { col: 5, row: 3 };
const ROUTES = [
  { col: 13, row: 2, width: 2.6, lift: 34 },
  { col: 14, row: 4, width: 1.8, lift: 20 },
  { col: 11, row: 6, width: 1.2, lift: 16 },
];

export function FlowMapChart() {
  const originTile = tileAt(ORIGIN.col, ORIGIN.row);
  if (!originTile) return null;
  const origin = tileCenter(originTile);
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
      {ROUTES.map((route, i) => {
        const tile = tileAt(route.col, route.row);
        if (!tile) return null;
        const target = tileCenter(tile);
        const mx = (origin.x + target.x) / 2;
        const my = Math.min(origin.y, target.y) - route.lift;
        const angle = Math.atan2(target.y - my, target.x - mx);
        const a1 = angle + Math.PI * 0.82;
        const a2 = angle - Math.PI * 0.82;
        const head = 5 + route.width;
        return (
          <g key={i} stroke={BLUE} fill="none">
            <path
              d={`M${origin.x} ${origin.y} Q${mx} ${my} ${target.x} ${target.y}`}
              strokeWidth={route.width}
              opacity="0.75"
              strokeLinecap="round"
            />
            <path
              d={`M${target.x} ${target.y} L${target.x + head * Math.cos(a1)} ${target.y + head * Math.sin(a1)} M${target.x} ${target.y} L${target.x + head * Math.cos(a2)} ${target.y + head * Math.sin(a2)}`}
              strokeWidth={route.width}
              opacity="0.75"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <circle cx={origin.x} cy={origin.y} r="4.5" fill={BLUE} stroke="none" />
      <text
        x={origin.x}
        y={origin.y + 12}
        textAnchor="middle"
        fontSize="4.5"
        fill={BLUE}
        className="font-mono"
      >
        hub
      </text>
      <text x="192" y="113" textAnchor="end" {...TXT.axis}>
        width = volume
      </text>
    </svg>
  );
}
