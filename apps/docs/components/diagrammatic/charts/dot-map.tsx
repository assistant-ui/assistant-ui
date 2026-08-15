import { TXT, VIEWBOX } from "./lib";
import { TILE, TILES } from "./map-tiles";

export function DotMapChart() {
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
          className="fill-foreground/6"
        />
      ))}
      {TILES.flatMap((tile) => {
        const density = Math.max(
          0,
          Math.round(
            3.2 *
              (Math.sin(tile.col * 0.9 + tile.row * 1.4) +
                Math.cos(tile.col * 0.4 - tile.row * 0.7)),
          ),
        );
        return Array.from({ length: density }, (_, k) => {
          const jx = ((tile.col * 7 + tile.row * 13 + k * 29) % 8) + 1.2;
          const jy = ((tile.col * 11 + tile.row * 5 + k * 17) % 7) + 1.6;
          return (
            <circle
              key={`${tile.col}-${tile.row}-${k}`}
              cx={tile.x + jx}
              cy={tile.y + jy}
              r="1.1"
              className="fill-foreground/60"
            />
          );
        });
      })}
      <text x="192" y="113" textAnchor="end" {...TXT.axis}>
        1 dot = 100 users
      </text>
    </svg>
  );
}
